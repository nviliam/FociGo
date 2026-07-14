"use client";
import { useEffect } from "react";

type Props = {
  backgroundColor: string;
  gridColor: string;
};

export function PageTheme({ backgroundColor, gridColor }: Props) {
  useEffect(() => {
    const prevColor = document.body.style.backgroundColor;
    const prevImage = document.body.style.backgroundImage;

    document.body.style.backgroundColor = backgroundColor;
    document.body.style.backgroundImage = `
      linear-gradient(${gridColor} 1px, transparent 1px),
      linear-gradient(90deg, ${gridColor} 1px, transparent 1px)
    `;

    return () => {
      document.body.style.backgroundColor = prevColor;
      document.body.style.backgroundImage = prevImage;
    };
  }, [backgroundColor, gridColor]);

  return null;
}
