"""Pytest configuration and fixtures."""

import pytest
from pathlib import Path
from PIL import Image
import numpy as np


@pytest.fixture
def test_images(tmp_path: Path):
    """Create temporary test images.

    Args:
        tmp_path: Pytest temporary directory

    Returns:
        List of paths to test images
    """
    images = []
    for i in range(5):
        # Create random image
        img_array = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
        img = Image.fromarray(img_array)

        # Save to temp directory
        img_path = tmp_path / f"test_image_{i}.jpg"
        img.save(img_path)
        images.append(img_path)

    return images
