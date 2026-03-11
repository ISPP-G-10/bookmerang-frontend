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
}

export const MATCHER_LAYOUT: MatcherLayoutConfig = {
  card: {
    widthPercent: 0.70,           // 85% del ancho de pantalla
    heightRatio: 1.6,             // altura = ancho × 1.6
    marginTopPercent: -0.10,      // -10% de altura (negativo para subir)
  },
  buttons: {
    bottomPercent: 0.02,          // 2% desde el bottom
    dislikeButtonPercent: 0.16,   // 17% del ancho de pantalla
    likeButtonPercent: 0.18,      // 18% del ancho de pantalla
    undoButtonPercent: 0.10,      // 10% del ancho de pantalla
    buttonGapPercent: 0.10,       // 10% del ancho entre botones
    iconSizeRatio: 0.5,           // iconos al 50% del tamaño del botón
  },
} as const;