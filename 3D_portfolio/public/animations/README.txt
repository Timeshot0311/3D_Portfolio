Drop .vrma files in this folder with the filenames below. Missing files
are silently skipped — the VTuber still loads with whatever clips exist.

Expected filenames (referenced by VRMA_MANIFEST in VTuberView.jsx):

  idle.vrma    ← default looping idle (REQUIRED for a nice default pose)
  wave.vrma    ← triggered by "wave", "hi there", "hello there"
  peace.vrma   ← triggered by "peace", "peace sign", "✌"
  bow.vrma     ← triggered by "thanks", "thank you", "bow"
  dance.vrma   ← triggered by "dance", "let's go", "party"
  nod.vrma     ← triggered by "yes", "sure", "of course"
  shake.vrma   ← triggered by "no", "nope", "don't think"

WHERE TO GET FREE VRMA FILES:

1) Pixiv's official sample pack (MIT-licensed, best starting point):
   https://github.com/pixiv/three-vrm-animation-samples/tree/main/packages/three-vrm-animation-samples/public

   Click a .vrma, then the "Download raw file" button. Rename to match
   the filenames above.

2) VRoid Hub often has user-uploaded pose/animation packs:
   https://hub.vroid.com/en/character_models?animation=1

3) Booth (Japanese, lots of free + paid):
   https://booth.pm/en/browse/3D%E3%83%A2%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3

If a clip doesn't look right on your VTuber (arms clip through body,
feet float), try a different source — VRMA retargets to the humanoid
skeleton but proportions still matter.
