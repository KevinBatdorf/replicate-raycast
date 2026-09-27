# Replicate Changelog

## [Replicate models in Raycast AI] - {PR_MERGE_DATE}

- Replicate models can be picked in Raycast AI's model picker (requires Raycast Pro). Image models reply with the image, editing models change an attached image or the last one in the chat, and text models stream their answer. A status section shows progress while a model runs
- New Raycast AI Models screen in the Replicate menu: popular image, image-editing and text models are offered and refreshed daily. Search Replicate to add any other model, hide popular ones, and set per-model chat defaults such as an aspect ratio. Models you've chatted with stay until you remove them
- `@replicate` picks from your Raycast AI models, or always uses your Default Model if you set one, can edit an existing image, and shows each step while an image generates. Fast models finish in a single step
- Runs started from Raycast AI stop after five minutes, so a chat you leave doesn't keep billing
- Run a Model lists every Replicate model with search, collections and a detail pane, builds its form from each model's inputs (including file uploads), remembers your last inputs, and runs official models on their own endpoint
- View Predictions is a list with a preview pane and a colored status dot. Generated images are saved on your computer (Image History setting) so they still show after Replicate deletes them, and scrolling to the end no longer repeats the list
- Requires Raycast 2.5 or later

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
