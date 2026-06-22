// hero.ts
import { heroui } from "@heroui/react";

export default heroui({
  themes: {
    light: {
      colors: {
        primary: "#6750a4",
        secondary: "#625b71",
        background: "#fffbfe",
        foreground: "#1c1b1f",
      }
    },
    dark: {
      colors: {
        primary: "#d0bcff",
        secondary: "#ccc2dc",
        background: "#1c1b1f",
        foreground: "#e6e1e5",
      }
    },
  },
});
