# RedScore first-aid training video

Original, restrained motion graphics with RedScore branding, narrated in German and English. No music, copied stock footage, third-party logos or generated medical demonstrations.

## Published assets

`dist/media/training/redscore-erste-hilfe-{de,en}.mp4`: H.264/AAC, 1280×720, 24 fps, fast-start MP4, normalised speech audio. About 3:42 (DE) and 3:08 (EN), under 4 MB each. Matching WebVTT captions, WebP posters and source-linked text transcripts are included.

The content is an orientation/refresher for sudden emergencies in **adults**: scene safety, responsiveness, emergency call 112 and dispatcher support, breathing assessment, recovery position versus resuscitation, chest compressions, rescue breaths, AED and continuing until professionals take over. It does not provide a practical demonstration or course attendance certificate. No claim of clinical accreditation or cooperation with the source organisations is made.

Source guidance checked on 18 November 2026:

- GRC: https://www.grc-org.de/laien-schulen/39-44-Wie-funktioniert-eine-Reanimation
- GRC 2026 poster: https://www.grc-org.de/files/ShopProducts/download/Poster%20Pruefen-Rufen-Druecken%202026.pdf
- DGUV, first-aid card, July 2025: https://publikationen.dguv.de/widgets/pdf/download/article/3107
- DRK: https://www.drk.de/hilfe-in-deutschland/erste-hilfe/erste-hilfe-massnahmen-zur-wiederbelebung-pruefen-rufen-druecken/
- DRK breathing assessment: https://www.drk.de/hilfe-in-deutschland/erste-hilfe/atmung/atemkontrolle/

The script and artwork are original paraphrases of these standard first-aid recommendations. A source review is not a medical-professional approval. Recheck the clinical guidance before future revisions.

## Regeneration

1. Install Pillow and imageio-ffmpeg in a local Python environment. They are authoring dependencies, not website runtime dependencies.
2. Edit `scripts/video/first-aid-scenes.json`; retain the adult scope and source references.
3. Run `scripts/video/synthesize-first-aid.ps1 -Language de` and `-Language en` with PowerShell 7 and Windows System.Speech. Current voices are Microsoft Stefan and Microsoft Zira Desktop. The speech is computer-generated. WAV files are kept only in ignored `tmp/first-aid-video/`.
4. Run `python scripts/video/render-first-aid.py` to generate the two videos, posters and captions. `--frames-only` generates stills for layout review. The renderer uses local fonts, current RedScore logo, short fades and measured scene-audio lengths.
5. Run `python scripts/video/prepare-first-aid-transcripts.py` for transcripts.
6. Verify all text layouts, decode both entire videos, inspect sound and caption timing, then check the native video player and knowledge check at mobile/tablet/desktop sizes.

## RedRewards integration

The migration adds bilingual media metadata and a per-lesson minimum learning duration. The new `first-aid-basics` lesson awards **30 points once**, for a correct knowledge check after 225 seconds of learning time. This measures minimum elapsed study time and a correct answer, not proof that every frame was watched. It does not award the separate 300-point first-aid course bonus. Returning to a lesson uses its saved server start timestamp rather than restarting the waiting time.

The player chooses the video language, captions and poster from lesson metadata. The original media files are served by RedScore; no external player or tracking service is loaded. Existing direct external-video URLs still require an explicit load click. An accessible text version and guidance link are available in the lesson. Video loading and seeking use native browser controls, including fullscreen. The service worker does not cache byte-range video responses. Existing offline app areas are unaffected.

Keep media activation after deployment: the videos and frontend can be deployed safely before applying the new lesson migration. The migration enables the lesson only when the assets are available.

`test/first-aid-video-integration.sql` uses a synthetic account in a rollback-only transaction: 224 seconds cannot complete the lesson; 226 seconds and the correct answer award 30 points, once. Existing rewards integration tests continue to verify unrelated balances and redemption invariants.
