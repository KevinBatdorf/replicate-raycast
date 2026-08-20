# Replicate Changelog

## [AI tool and modernized internals] - 2026-08-20

- Added a `generate-image` AI tool, so Raycast AI can run a Replicate model from a chat prompt and show the result inline
- Generated images are saved locally, since Replicate deletes output files about an hour after the prediction runs
- Added preferences for the default model and for confirming a generation before it bills your account
- Prompt search now filters the predictions already on screen instead of a local sqlite index, which was returning nothing
- Explore Models opens replicate.com/explore, and the model dropdown reads the text-to-image collection — the old diffusion-models collection is gone
- Copying an image no longer needs Finder automation permission
- Fixed predictions with a single image being indexed under a garbled id, which put junk rows in the prompt search
- Fixed the model form hanging forever on a prediction cancelled from replicate.com
- Failed requests now surface Replicate's own error message instead of "Something went wrong"

## [Updated Grid component and Replicate name] - 2022-11-05

- Updated Replicate name
- Updated to support the new columns api on the Grid component

## [Added Open In Browser action] - 2022-10-11

- Added an Open In Browser action to view on replicate.com

## [Added Replicate] - 2022-09-17

- Initial version code
