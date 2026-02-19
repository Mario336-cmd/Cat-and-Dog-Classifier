# Cat/Dog/Unknown Image Classifier

End-to-end project for training and serving an image classifier that predicts one of three classes: `Cat`, `Dog`, or `Unknown`.

## Quick Start (Web App)

The web app runs inference fully in the browser using TensorFlow.js and a pre-exported graph model.

```bash
cd Frontend
npm install
npm run dev
```

Build and preview the production bundle:

```bash
npm run build
npm run preview
```

## What This Repository Contains

- `AI Model/`: training notebook (`cat_dog_classifier.ipynb`), saved Keras model, and training/output artifacts.
- `Datasets/`: source archives, extracted datasets, prepared pools, train/validation splits, and holdout test sets.
- `Frontend/`: Vite + React + TypeScript app and TensorFlow.js model assets (`public/model_graph`).

## End-to-End Pipeline Overview

1. Extract and prepare cat/dog images from source datasets into a combined pool.
2. Build an `unknown` class from Places365 and COCO-derived non-cat/dog images.
3. Create reproducible train/validation splits for `cats`, `dogs`, and `unknown`.
4. Train a MobileNetV2-based classifier in two phases:
   - feature extraction (frozen backbone)
   - fine-tuning (last layers unfrozen)
5. Freeze an unknown-confidence threshold selected on validation data.
6. Serve inference in the frontend with TensorFlow.js graph model files.

## Dataset and Split Summary

Source archives are stored in `Datasets/Original Datasets (Zip and tar Files)`.

Dataset sources used by this project:

- Microsoft Cats vs Dogs (PetImages): [`kagglecatsanddogs_5340.zip`](https://download.microsoft.com/download/3/E/1/3E1C3F21-ECDB-4869-8368-6DEBA77B919F/kagglecatsanddogs_5340.zip)
- freeCodeCamp cats and dogs archive: [`cats_and_dogs.zip`](https://cdn.freecodecamp.org/project-data/cats-and-dogs/cats_and_dogs.zip)
- Oxford-IIIT Pet Dataset: [`images.tar.gz`](https://www.robots.ox.ac.uk/~vgg/data/pets/data/images.tar.gz)
- Oxford-IIIT Pet Dataset: [`annotations.tar.gz`](https://www.robots.ox.ac.uk/~vgg/data/pets/data/annotations.tar.gz)
- Places365-Standard dataset page: [`places2.csail.mit.edu/download.html`](http://places2.csail.mit.edu/download.html)
- Places365-Standard file used here: [`val_256.tar`](http://data.csail.mit.edu/places/places365/val_256.tar)
- MS COCO dataset page: [`cocodataset.org/#download`](https://cocodataset.org/#download)
- MS COCO file used here: [`val2017.zip`](http://images.cocodataset.org/zips/val2017.zip)
- MS COCO file used here: [`annotations_trainval2017.zip`](http://images.cocodataset.org/annotations/annotations_trainval2017.zip)

| Dataset Stage | Cats | Dogs | Unknown |
| --- | ---: | ---: | ---: |
| Prepared combined pool (`Datasets/Prepared/combined_pool`) | 13427 | 13397 | 32850 |
| Train split (`Datasets/Splits/train_split`) | 10741 | 10717 | 26280 |
| Validation split (`Datasets/Splits/validation_split`) | 2686 | 2680 | 6570 |

| Holdout Test Set | Count |
| --- | ---: |
| Oxford cats (`Datasets/Test/oxford_test/cats`) | 2400 |
| Oxford dogs (`Datasets/Test/oxford_test/dogs`) | 4990 |
| Unknown Places (`Datasets/Test/unknown_test/unknown_places`) | 3650 |
| Unknown COCO (`Datasets/Test/unknown_test/unknown_coco`) | 3984 |

## Model Details

- Architecture: MobileNetV2 transfer learning with a custom dense classification head.
- Input size: `224x224`.
- Class index mapping (`AI Model/outputs/class_indices.json`):
  - `cats: 0`
  - `dogs: 1`
  - `unknown: 2`
- Frozen unknown gating threshold (`AI Model/outputs/frozen_threshold.json`): `0.46`.
- Saved training artifact: `AI Model/models/cat_dog_unknown_classifier.keras`.

## Evaluation Snapshot

Metrics below come from the holdout evaluation outputs embedded in `AI Model/cat_dog_classifier.ipynb` and are tied to the current saved artifacts/splits.

- Oxford holdout (cats/dogs truth), accuracy with `unknown` counted as wrong: `98.23%`
- Rejected-as-unknown rate: `0.49%`
- Cats rejected as unknown: `0.92%`
- Dogs rejected as unknown: `0.28%`
- Unknown prediction rate on unknown-only holdouts:
  - Places: `99.12%`
  - COCO: `98.95%`

## Frontend Inference Notes

- Input modes: local file upload or image URL.
- Upload constraints: `JPG`, `PNG`, `WEBP`, max `10 MB`.
- URL input may fail due to remote server CORS policy; direct upload is the fallback.
- TensorFlow.js model files are served from `Frontend/public/model_graph`.

## Training / Reproduction Notes

- Primary training workflow lives in `AI Model/cat_dog_classifier.ipynb`.
- No pinned Python environment file is currently committed (`requirements.txt`, `pyproject.toml`, etc.).
- Minimal dependency install:

```bash
python -m pip install tensorflow numpy matplotlib
```

- Expected training outputs:
  - model artifacts in `AI Model/models`
  - metadata/history in `AI Model/outputs`

## Deployment Notes (GitHub Pages)

- The frontend is deployable as a static site.
- For project pages (for example `https://<user>.github.io/<repo>/`), set Vite `base` to the repo path in `Frontend/vite.config.ts`.
- Deploy only frontend build output (`Frontend/dist`) for hosting.
- Do not deploy large dataset directories; keep training data out of static hosting artifacts.
- Large dataset archives in this repo exceed normal Git hosting file-size limits, so they should not be pushed in standard Git flows without LFS or external storage.

## Limitations

- Browser CORS can block URL-based image fetches.
- Unknown detection is threshold-based and can trade off rejection rate vs cat/dog misclassification.
- Repository footprint is large due to dataset archives and extracted artifacts.

## Future Improvements

- Add pinned Python dependencies (`requirements.txt` or equivalent).
- Add a reproducible model export/conversion script for TFJS graph assets.
- Add CI checks for frontend build and documentation consistency.

## License / Data Usage Placeholder

Before public release, add explicit project licensing and dataset usage/redistribution terms for every upstream dataset included or referenced by this repository.
