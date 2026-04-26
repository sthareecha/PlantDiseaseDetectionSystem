import json
import re
import sys
from pathlib import Path


def extract_strings_from_ipynb(ipynb_path: Path) -> str:
    # ipynb is JSON; we want a best-effort string blob of all cell sources
    data = json.loads(ipynb_path.read_text(encoding="utf-8"))
    parts: list[str] = []
    for cell in data.get("cells", []):
        src = cell.get("source", [])
        if isinstance(src, list):
            parts.append("".join(src))
        elif isinstance(src, str):
            parts.append(src)
    return "\n".join(parts)


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python ml/extract_notebook_info.py <path-to-ipynb>")
        raise SystemExit(2)

    ipynb_path = Path(sys.argv[1])
    if not ipynb_path.exists():
        print(f"Not found: {ipynb_path}")
        raise SystemExit(2)

    blob = extract_strings_from_ipynb(ipynb_path)

    # model filenames that appear in the notebook
    pth_files = sorted(set(re.findall(r"[A-Za-z0-9_\-]+\.pth", blob)))

    # the specifically assigned MODEL_SAVE_NAME if present
    m = re.search(r"MODEL_SAVE_NAME\s*=\s*['\"]([^'\"]+\.pth)['\"]", blob)
    model_save_name = m.group(1) if m else None

    m2 = re.search(r"SAVE_PATH\s*=\s*['\"]([^'\"]+\.pth)['\"]", blob)
    best_save_path = m2.group(1) if m2 else None

    # image size and class count hints
    m3 = re.search(r"IMG_SIZE\s*=\s*(\d+)", blob)
    img_size = int(m3.group(1)) if m3 else None

    m4 = re.search(r"NUM_CLASSES\s*=\s*len\(classes\)", blob)
    num_classes = 10 if m4 else None  # notebook states 10 classes

    out = {
        "notebook": str(ipynb_path.name),
        "foundPthNames": pth_files,
        "modelSaveName": model_save_name,
        "bestWeightsName": best_save_path,
        "imgSize": img_size,
        "numClasses": num_classes,
        "note": "This extracts filenames/config hints from the notebook. Actual weights file must be downloaded from Colab and placed into the project (see server /api/detect expectedPaths).",
    }

    print(json.dumps(out, indent=2))


if __name__ == "__main__":
    main()
