"""OpenCLIP model wrapper for generating embeddings."""

import logging
from pathlib import Path
from typing import List, Union

import numpy as np
import open_clip
import torch
from PIL import Image

logger = logging.getLogger(__name__)


class ClipModel:
    """Wrapper for OpenCLIP model for image and text embeddings."""

    def __init__(
        self,
        model_name: str = "ViT-B-32",
        pretrained: str = "laion2b_s34b_b79k",
        device: str = "cpu",
    ):
        """Initialize CLIP model.

        Args:
            model_name: Model architecture (e.g., 'ViT-B-32')
            pretrained: Pretrained weights identifier
            device: Device to run model on ('cpu' or 'cuda')
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
            model_name, pretrained=pretrained, device=self.device
        )

        self.tokenizer = open_clip.get_tokenizer(model_name)

        # Set to eval mode
        self.model.eval()

        logger.info("Model loaded successfully")

    @torch.no_grad()
    def encode_image(self, image: Union[Image.Image, Path, str]) -> np.ndarray:
        """Generate embedding for a single image.

        Args:
            image: PIL Image or path to image file

        Returns:
            Normalized embedding vector (numpy array)

        Raises:
            FileNotFoundError: If image path doesn't exist
            Exception: If image loading or encoding fails
        """
        try:
            # Load image if path provided
            if isinstance(image, (Path, str)):
                image_path = Path(image)
                if not image_path.exists():
                    raise FileNotFoundError(f"Image not found: {image_path}")
                image = Image.open(image_path).convert("RGB")

            # Preprocess and move to device
            image_tensor = self.preprocess(image).unsqueeze(0).to(self.device)

            # Generate embedding
            image_features = self.model.encode_image(image_tensor)

            # Normalize
            image_features /= image_features.norm(dim=-1, keepdim=True)

            # Return as numpy array on CPU
            return image_features.cpu().numpy()[0]

        except Exception as e:
            logger.error(f"Failed to encode image: {e}")
            raise

    @torch.no_grad()
    def encode_images_batch(
        self, images: List[Union[Image.Image, Path, str]], batch_size: int = 32
    ) -> np.ndarray:
        """Generate embeddings for multiple images in batches.

        Args:
            images: List of PIL Images or paths
            batch_size: Number of images to process at once

        Returns:
            Array of embeddings, shape (n_images, embedding_dim)

        Raises:
            Exception: If batch processing fails
        """
        all_embeddings = []

        try:
            for i in range(0, len(images), batch_size):
                batch_images = images[i : i + batch_size]

                # Load and preprocess
                batch_tensors = []
                for img in batch_images:
                    try:
                        if isinstance(img, (Path, str)):
                            img = Image.open(img).convert("RGB")
                        batch_tensors.append(self.preprocess(img))
                    except Exception as e:
                        logger.warning(f"Failed to load image, skipping: {e}")
                        continue

                if not batch_tensors:
                    continue

                # Stack and move to device
                batch_tensor = torch.stack(batch_tensors).to(self.device)

                # Encode
                embeddings = self.model.encode_image(batch_tensor)

                # Normalize
                embeddings /= embeddings.norm(dim=-1, keepdim=True)

                all_embeddings.append(embeddings.cpu().numpy())

            if not all_embeddings:
                return np.array([])

            return np.vstack(all_embeddings)

        except Exception as e:
            logger.error(f"Batch encoding failed: {e}")
            raise

    @torch.no_grad()
    def encode_text(self, text: Union[str, List[str]]) -> np.ndarray:
        """Generate embedding for text query.

        Args:
            text: Single string or list of strings

        Returns:
            Normalized embedding vector(s)

        Raises:
            Exception: If text encoding fails
        """
        try:
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

        except Exception as e:
            logger.error(f"Failed to encode text: {e}")
            raise

    def get_model_info(self) -> dict:
        """Get model information.

        Returns:
            Dictionary with model metadata
        """
        return {
            "model_name": self.model_name,
            "pretrained": self.pretrained,
            "device": str(self.device),
            "embedding_dim": self.model.visual.output_dim,
            "parameters": sum(p.numel() for p in self.model.parameters()),
        }
