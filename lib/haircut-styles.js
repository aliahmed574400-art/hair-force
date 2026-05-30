export const HAIRCUT_STYLES = [
  {
    id: "buzz-cut",
    label: "Buzz cut",
    helper: "Short and even",
    prompt: "a clean buzz cut with very short, even hair all around"
  },
  {
    id: "crew-cut",
    label: "Crew cut",
    helper: "Neat top",
    prompt: "a classic crew cut with a short neat top and tapered sides"
  },
  {
    id: "fade",
    label: "Fade",
    helper: "Tapered sides",
    prompt: "a modern fade haircut with neatly blended tapered sides"
  },
  {
    id: "undercut",
    label: "Undercut",
    helper: "Sharp contrast",
    prompt: "a polished undercut with short sides and the existing top styled naturally"
  },
  {
    id: "bob-cut",
    label: "Bob cut",
    helper: "Jaw length",
    prompt: "a sleek jaw-length bob cut with natural volume"
  },
  {
    id: "pixie-cut",
    label: "Pixie cut",
    helper: "Soft crop",
    prompt: "a soft pixie cut with natural texture"
  },
  {
    id: "curtain-bangs",
    label: "Curtain bangs",
    helper: "Face framing",
    prompt: "face-framing curtain bangs while preserving the current hair color and texture"
  },
  {
    id: "long-layers",
    label: "Long layers",
    helper: "Light movement",
    prompt: "long layered hair with subtle movement and the original hair color"
  }
];

export function findHaircutStyle(styleId) {
  return HAIRCUT_STYLES.find((style) => style.id === styleId);
}
