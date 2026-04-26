import argparse
import json
from pathlib import Path

import torch
from PIL import Image, ImageOps
from torchvision import transforms

from tomato_model_v3 import TomatoCNN


DEFAULT_CLASSES = [
    "Tomato___Bacterial_spot",
    "Tomato___Early_blight",
    "Tomato___Late_blight",
    "Tomato___Leaf_Mold",
    "Tomato___Septoria_leaf_spot",
    "Tomato___Spider_mites Two-spotted_spider_mite",
    "Tomato___Target_Spot",
    "Tomato___Tomato_Yellow_Leaf_Curl_Virus",
    "Tomato___Tomato_mosaic_virus",
    "Tomato___healthy",
]


def load_checkpoint(checkpoint_path: Path):
    obj = torch.load(checkpoint_path, map_location="cpu")

    # Case 1: full checkpoint dict
    if isinstance(obj, dict) and ("model_state_dict" in obj or "state_dict" in obj):
        state = obj.get("model_state_dict") or obj.get("state_dict")
        classes = obj.get("classes") or obj.get("class_names") or DEFAULT_CLASSES
        img_size = int(obj.get("img_size") or obj.get("IMG_SIZE") or 64)
        return state, classes, img_size

    # Case 2: raw state_dict only
    if isinstance(obj, dict):
        return obj, DEFAULT_CLASSES, 64

    raise ValueError("Unsupported checkpoint format")


def _green_bbox(img: Image.Image):
    """Return an (l,t,r,b) box for likely-leaf pixels, or None.

    Heuristic: leaf pixels tend to have higher G than R/B.
    Works reasonably for tomato leaves even with brown/black lesions.
    """

    w, h = img.size
    if w < 10 or h < 10:
        return None

    # Downscale for speed but keep enough detail.
    target_max = 512
    scale = 1.0
    if max(w, h) > target_max:
        scale = target_max / float(max(w, h))
        img_small = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.BILINEAR)
    else:
        img_small = img

    sw, sh = img_small.size
    px = img_small.load()

    left = sw
    top = sh
    right = -1
    bottom = -1
    count = 0

    # Thresholds tuned to be conservative.
    for y in range(sh):
        for x in range(sw):
            r, g, b = px[x, y]
            if g > 60 and g > r + 15 and g > b + 15:
                count += 1
                if x < left:
                    left = x
                if y < top:
                    top = y
                if x > right:
                    right = x
                if y > bottom:
                    bottom = y

    if count == 0 or right < left or bottom < top:
        return None

    area = (right - left + 1) * (bottom - top + 1)
    img_area = sw * sh

    # Reject tiny/noisy boxes and boxes that cover almost everything.
    if area < int(img_area * 0.02) or area > int(img_area * 0.98):
        return None

    # Map bbox back to original coordinates.
    if img_small is img:
        return (left, top, right + 1, bottom + 1)

    inv = 1.0 / scale
    return (
        int(left * inv),
        int(top * inv),
        int((right + 1) * inv),
        int((bottom + 1) * inv),
    )


def _square_crop(img: Image.Image, box, pad_frac: float = 0.12) -> Image.Image:
    l, t, r, b = box
    w, h = img.size
    l = max(0, min(l, w - 1))
    t = max(0, min(t, h - 1))
    r = max(l + 1, min(r, w))
    b = max(t + 1, min(b, h))

    bw = r - l
    bh = b - t
    side = int(max(bw, bh) * (1.0 + pad_frac * 2.0))
    side = max(side, 32)

    cx = (l + r) // 2
    cy = (t + b) // 2
    half = side // 2

    nl = max(0, cx - half)
    nt = max(0, cy - half)
    nr = min(w, nl + side)
    nb = min(h, nt + side)

    # If clamped on the right/bottom, shift left/up to maintain size.
    nl = max(0, nr - side)
    nt = max(0, nb - side)

    return img.crop((nl, nt, nr, nb))


def preprocess_image(image_path: Path) -> tuple[Image.Image, dict]:
    """Load + preprocess a real-world photo to better match PlantVillage framing."""
    img = Image.open(image_path)
    img = ImageOps.exif_transpose(img)

    # Robust conversion to RGB (handles RGBA / P mode etc.)
    if img.mode != "RGB":
        img = img.convert("RGB")

    info = {"exifTransposed": True, "leafCrop": False}

    bbox = _green_bbox(img)
    if bbox is not None:
        img = _square_crop(img, bbox)
        info["leafCrop"] = True

    return img, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--checkpoint", required=True)
    ap.add_argument("--image", required=True)
    ap.add_argument("--topk", type=int, default=3)
    args = ap.parse_args()

    checkpoint_path = Path(args.checkpoint)
    image_path = Path(args.image)

    state_dict, classes, img_size = load_checkpoint(checkpoint_path)

    model = TomatoCNN(num_classes=len(classes))
    model.load_state_dict(state_dict)
    model.eval()

    tfm = transforms.Compose(
        [
            transforms.Resize((img_size, img_size)),
            transforms.ToTensor(),
            transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
        ]
    )

    img, pp_info = preprocess_image(image_path)
    x = tfm(img).unsqueeze(0)

    with torch.no_grad():
        logits = model(x)
        probs = torch.softmax(logits, dim=1).squeeze(0)

    topk = max(1, min(int(args.topk), probs.numel()))
    top_probs, top_idx = torch.topk(probs, k=topk)

    top = []
    for p, i in zip(top_probs.tolist(), top_idx.tolist()):
        top.append({"label": classes[i], "confidence": round(p * 100, 2)})

    best = top[0]

    out = {
        "label": best["label"],
        "confidence": best["confidence"],
        "top": top,
        "classes": classes,
        "imgSize": img_size,
        "preprocess": pp_info,
    }

    print(json.dumps(out))


if __name__ == "__main__":
    main()
