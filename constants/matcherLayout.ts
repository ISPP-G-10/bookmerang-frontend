interface CardConfig {
  widthPercent: number;    
  heightRatio: number;      
  marginTopPercent: number;  
}

interface ButtonsConfig {
  bottomPercent: number;       
  dislikeButtonPercent: number; 
  likeButtonPercent: number;    
  undoButtonPercent: number;   
  buttonGapPercent: number;    
  iconSizeRatio: number;   
}

export interface MatcherLayoutConfig {
  card: CardConfig;
  buttons: ButtonsConfig;
  /** Max effective width (px) used for size calculations – prevents giant cards on laptop/desktop. */
  maxEffectiveWidth: number;
}

export const MATCHER_LAYOUT: MatcherLayoutConfig = {
  card: {
    widthPercent: 0.70,           // 70% del ancho de pantalla
    heightRatio: 1.6,             // altura = ancho × 1.6
    marginTopPercent: -0.10,      // -10% de altura (negativo para subir)
  },
  buttons: {
    bottomPercent: 0.02,          // 2% desde el bottom
    dislikeButtonPercent: 0.16,   // 16% del ancho de pantalla
    likeButtonPercent: 0.18,      // 18% del ancho de pantalla
    undoButtonPercent: 0.10,      // 10% del ancho de pantalla
    buttonGapPercent: 0.10,       // 10% del ancho entre botones
    iconSizeRatio: 0.5,           // iconos al 50% del tamaño del botón
  },
  maxEffectiveWidth: 420,         // cap absoluto para pantallas anchas (portátil/desktop)
} as const;

/**
 * Returns an effective width that keeps the card properly sized on any screen.
 *
 * On mobile the value equals screenWidth (no change).
 * On laptop/desktop it is capped so that:
 *   1. It never exceeds maxEffectiveWidth (420px).
 *   2. The resulting card height (W × widthPercent × heightRatio) fits within
 *      ~65% of the available screen height, leaving room for header + buttons.
 */
export const getEffectiveWidth = (screenWidth: number, screenHeight?: number): number => {
  const { maxEffectiveWidth, card } = MATCHER_LAYOUT;

  // Step 1: absolute cap
  let W = Math.min(screenWidth, maxEffectiveWidth);

  // Step 2: if we know the height, shrink further so the card doesn't overflow vertically
  if (screenHeight) {
    const maxCardHeight = screenHeight * 0.65; // 65% of viewport for the card
    const maxWidthFromHeight = maxCardHeight / (card.widthPercent * card.heightRatio);
    W = Math.min(W, maxWidthFromHeight);
  }

  return W;
};