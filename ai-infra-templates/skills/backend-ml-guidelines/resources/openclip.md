# OpenCLIP Integration

This document covers using OpenCLIP for generating image and text embeddings.

---

## OpenCLIP Overview

OpenCLIP is an open-source implementation of OpenAI's CLIP (Contrastive Language-Image Pre-training).

**Key Features**:
- Joint image-text embeddings
- Zero-shot image classification
- Semantic image search
- Multiple model architectures and sizes

---

## Model Selection

### Available Models

Common models (speed vs accuracy trade-off):

| Model | Parameters | Image Size | Speed | Accuracy |
|-------|-----------|------------|-------|----------|
| ViT-B-32 | 86M | 224x224 | Fast | Good |
| ViT-B-16 | 86M | 224x224 | Medium | Better |
| ViT-L-14 | 303M | 224x224 | Slow | Best |
| RN50 | 38M | 224x224 | Fastest | Fair |

**Recommendation**: Start with `ViT-B-32` for good balance of speed and accuracy.

### Pretrained Weights

```python
import open_clip

# List available models
models = open_clip.list_pretrained()
for model_name, pretrained_name in models:
    print(f"{model_name}: {pretrained_name}")

# Popular choices:
# - ViT-B-32: laion2b_s34b_b79k
# - ViT-L-14: laion2b_s32b_b82k
```

---

## Implementation

### `models/clip_model.py`

```python
"""OpenCLIP model wrapper."""

import logging
from pathlib import Path
from typing import Literal

import numpy as np
import open_clip
import torch
from PIL import Image

logger = logging.getLogger(__name__)


class ClipModel:
    """Wrapper for OpenCLIP model."""

    def __init__(
        self,
        model_name: str = "ViT-B-32",
        pretrained: str = "laion2b_s34b_b79k",
        device: Literal["cuda", "cpu"] = "cuda"
    ):
        """Initialize CLIP model.

        Args:
            model_name: Model architecture (e.g., 'ViT-B-32')
            pretrained: Pretrained weights identifier
            device: Device to run model on ('cuda' or 'cpu')
        """
        self.model_name = model_name
        self.pretrained = pretrained

        # Auto-detect device if cuda not available
        if device == "cuda" and not torch.cuda.is_available():
            logger.warning("CUDA not available, using CPU")
            device = "cpu"

        self.device = torch.device(device)

        logger.info(f"Loading {model_name} ({pretrained}) on {device}")

        # Load model
        self.model, _, self.preprocess = open_clip.create_model_and_transforms(
            model_name,
            pretrained=pretrained,
            device=self.device
        )

        self.tokenizer = open_clip.get_tokenizer(model_name)

        # Set to eval mode
        self.model.eval()

        logger.info("Model loaded successfully")

    @torch.no_grad()
    def encode_image(self, image: Image.Image | Path | str) -> np.ndarray:
        """Generate embedding for a single image.

        Args:
            image: PIL Image or path to image file

        Returns:
            Normalized embedding vector (numpy array)
        """
        # Load image if path provided
        if isinstance(image, (Path, str)):
            image = Image.open(image).convert("RGB")

        # Preprocess and move to device
        image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)

        # Generate embedding
        image_features = self.model.encode_image(image_tensor)

        # Normalize
        image_features /= image_features.norm(dim=-1, keepdim=True)

        # Return as numpy array on CPU
        return image_features.cpu().numpy()[0]

    @torch.no_grad()
    def encode_images_batch(
        self,
        images: list[Image.Image | Path | str],
        batch_size: int = 32
    ) -> np.ndarray:
        """Generate embeddings for multiple images in batches.

        Args:
            images: List of PIL Images or paths
            batch_size: Number of images to process at once

        Returns:
            Array of embeddings, shape (n_images, embedding_dim)
        """
        all_embeddings = []

        for i in range(0, len(images), batch_size):
            batch_images = images[i:i + batch_size]

            # Load and preprocess
            batch_tensors = []
            for img in batch_images:
                if isinstance(img, (Path, str)):
                    img = Image.open(img).convert("RGB")
                batch_tensors.append(self.preprocess(img))

            # Stack and move to device
            batch_tensor = torch.stack(batch_tensors).to(self.device)

            # Encode
            embeddings = self.model.encode_image(batch_tensor)

            # Normalize
            embeddings /= embeddings.norm(dim=-1, keepdim=True)

            all_embeddings.append(embeddings.cpu().numpy())

        return np.vstack(all_embeddings)

    @torch.no_grad()
    def encode_text(self, text: str | list[str]) -> np.ndarray:
        """Generate embedding for text query.

        Args:
            text: Single string or list of strings

        Returns:
            Normalized embedding vector(s)
        """
        # Ensure list
        if isinstance(text, str):
            text = [text]

        # Tokenize
        text_tokens = self.tokenizer(text).to(self.device)

        # Encode
        text_features = self.model.encode_text(text_tokens)

        # Normalize
        text_features /= text_features.norm(dim=-1, keepdim=True)

        # Return as numpy
        embeddings = text_features.cpu().numpy()

        # Return single vector if single text
        return embeddings[0] if len(text) == 1 else embeddings

    def get_model_info(self) -> dict:
        """Get model information."""
        return {
            "model_name": self.model_name,
            "pretrained": self.pretrained,
            "device": str(self.device),
            "embedding_dim": self.model.visual.output_dim,
            "parameters": sum(p.numel() for p in self.model.parameters())
        }
```

---

## Usage Examples

### Single Image Embedding

```python
from PIL import Image
from models.clip_model import ClipModel

model = ClipModel()

# From path
embedding = model.encode_image("/path/to/image.jpg")
print(embedding.shape)  # (512,) for ViT-B-32

# From PIL Image
image = Image.open("/path/to/image.jpg")
embedding = model.encode_image(image)
```

### Batch Image Embedding

```python
from pathlib import Path

# Get all images in a folder
image_paths = list(Path("/path/to/images").glob("*.jpg"))

# Embed in batches
embeddings = model.encode_images_batch(image_paths, batch_size=32)
print(embeddings.shape)  # (n_images, 512)
```

### Text Embedding

```python
# Single query
query_embedding = model.encode_text("a red sports car")
print(query_embedding.shape)  # (512,)

# Multiple queries
queries = ["red car", "blue truck", "yellow motorcycle"]
embeddings = model.encode_text(queries)
print(embeddings.shape)  # (3, 512)
```

### Similarity Calculation

```python
import numpy as np

# Text and image embeddings
text_emb = model.encode_text("red car")
image_emb = model.encode_image("/path/to/car.jpg")

# Cosine similarity (embeddings are already normalized)
similarity = np.dot(text_emb, image_emb)
print(f"Similarity: {similarity:.4f}")  # 0.0 to 1.0
```

---

## Optimization Tips

### GPU Acceleration

```python
# Check CUDA availability
import torch

if torch.cuda.is_available():
    print(f"CUDA available: {torch.cuda.get_device_name(0)}")
    device = "cuda"
else:
    device = "cpu"

model = ClipModel(device=device)
```

### Mixed Precision (FP16)

```python
# Use half precision for faster inference
model.model.to(torch.float16)

# Adjust encode methods to handle fp16
@torch.no_grad()
def encode_image_fp16(self, image):
    image_tensor = self.preprocess(image).unsqueeze(0).to(self.device).half()
    image_features = self.model.encode_image(image_tensor)
    image_features /= image_features.norm(dim=-1, keepdim=True)
    return image_features.cpu().float().numpy()[0]
```

### Batch Size Tuning

```python
# Larger batches = better GPU utilization, but more memory
# Start with 32, increase if memory allows

# Monitor memory usage
if torch.cuda.is_available():
    print(f"GPU memory: {torch.cuda.memory_allocated() / 1e9:.2f} GB")
```

---

## Error Handling

```python
def encode_image_safe(self, image_path: Path) -> np.ndarray | None:
    """Encode image with error handling."""
    try:
        return self.encode_image(image_path)
    except FileNotFoundError:
        logger.error(f"Image not found: {image_path}")
        return None
    except Exception as e:
        logger.error(f"Failed to encode {image_path}: {e}")
        return None
```

---

## Testing

```python
import pytest
from models.clip_model import ClipModel


@pytest.fixture
def clip_model():
    return ClipModel(device="cpu")


def test_encode_text(clip_model):
    embedding = clip_model.encode_text("test query")
    assert embedding.shape == (512,)
    assert -1 <= embedding.min() <= embedding.max() <= 1


def test_encode_image(clip_model, test_image_path):
    embedding = clip_model.encode_image(test_image_path)
    assert embedding.shape == (512,)
    assert np.allclose(np.linalg.norm(embedding), 1.0, atol=1e-5)


def test_batch_encoding(clip_model, test_images):
    embeddings = clip_model.encode_images_batch(test_images)
    assert embeddings.shape == (len(test_images), 512)
```

---

**Last Updated**: 2025-11-05
