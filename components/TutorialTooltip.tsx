import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Dimensions, LayoutRectangle, ScrollView, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { useCopilot } from 'react-native-copilot';

interface StepContent {
  icon: string;
  title: string;
  body: string;
}

const DEFAULT_STEP_CONTENT: Record<string, StepContent> = {
  welcome: {
    icon: '📚',
    title: 'Bienvenido/a',
    body: 'Te mostramos rapidamente las secciones principales de Bookmerang.',
  },
  'matcher-tab': {
    icon: '💘',
    title: 'Matcher',
    body: 'Desliza para descubrir libros y conseguir matches.',
  },
  'chat-tab': {
    icon: '💬',
    title: 'Chats',
    body: 'Aqui veras tus conversaciones para acordar los intercambios.',
  },
  'subir-tab': {
    icon: '➕',
    title: 'Sube tus libros',
    body: 'Publica tus libros para que otros usuarios puedan hacer match contigo.',
  },
  'comunidades-tab': {
    icon: '🏡',
    title: 'Comunidades',
    body: 'Participa en grupos de lectura y actividades presenciales.',
  },
  'bookspots-tab': {
    icon: '📍',
    title: 'BookSpots',
    body: 'Encuentra lugares para realizar los intercambios de forma segura.',
  },
};

function parseStepContent(text: string): StepContent | null {
  try {
    const p = JSON.parse(text);
    if (p && typeof p.title === 'string' && typeof p.body === 'string') return p;
  } catch {}
  return null;
}

const EDGE_MARGIN = 12;
const COPILOT_MARGIN = 13;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export default function TutorialTooltip() {
  const {
    currentStep,
    isFirstStep,
    isLastStep,
    goToNext,
    goToPrev,
    stop,
    currentStepNumber,
    totalStepsNumber,
  } = useCopilot();

  const content = parseStepContent(currentStep?.text ?? '');
  const defaultContent = currentStep?.name ? DEFAULT_STEP_CONTENT[currentStep.name] : undefined;
  const rawText = currentStep?.text?.trim() ?? '';
  const title = content?.title ?? defaultContent?.title ?? 'Tutorial';
  const body = content?.body ?? (rawText ? rawText : defaultContent?.body ?? 'Continua con el tutorial.');
  const icon = content?.icon ?? defaultContent?.icon ?? '';

  const totalSteps = totalStepsNumber ?? 6;
  const currentNum = currentStepNumber ?? 1;
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const useCompactActionsLayout = !isFirstStep && windowWidth < 430;

  // Mantiene el anclaje nativo de Copilot y solo corrige desbordes laterales.
  const containerRef = useRef<View>(null);
  const [correctionX, setCorrectionX] = useState(0);
  const [ready, setReady] = useState(false);
  const [stepRect, setStepRect] = useState<LayoutRectangle | null>(null);

  const applyHorizontalCorrection = useCallback(async () => {
    if (!containerRef.current) {
      setReady(true);
      return;
    }

    containerRef.current.measureInWindow((x, _y, w) => {
      const screenWidth = Dimensions.get('window').width;
      if (w <= 0 || screenWidth <= 0) {
        setReady(true);
        return;
      }

      const minLeft = EDGE_MARGIN;
      const maxLeft = Math.max(EDGE_MARGIN, screenWidth - w - EDGE_MARGIN);
      const clampedLeft = clamp(x, minLeft, maxLeft);
      const newCorrectionX = clampedLeft - x;

      setCorrectionX(Math.abs(newCorrectionX) < 0.5 ? 0 : newCorrectionX);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    setCorrectionX(0);
    setReady(false);

    // Fallback: si measureInWindow nunca llama de vuelta (limitación de
    // React Native Web en móvil), mostramos el tooltip tras 300ms en su
    // posición natural para que nunca quede permanentemente invisible.
    const fallbackTimer = setTimeout(() => {
      setReady(true);
    }, 300);

    // Reintento tras la transicion de tab (especialmente util en web/mobile
    // cuando el layout definitivo llega unas decenas de ms tarde).
    const delayedReposition = setTimeout(() => {
      void applyHorizontalCorrection();
    }, 140);

    return () => {
      clearTimeout(fallbackTimer);
      clearTimeout(delayedReposition);
    };
  }, [currentStep?.name, currentStep?.order, windowWidth, applyHorizontalCorrection]);

  useEffect(() => {
    let cancelled = false;

    const measureStep = async () => {
      if (!currentStep?.measure) {
        if (!cancelled) setStepRect(null);
        return;
      }

      try {
        const rect = await currentStep.measure();
        if (!cancelled) setStepRect(rect);
      } catch {
        if (!cancelled) setStepRect(null);
      }
    };

    void measureStep();

    const delayedMeasure = setTimeout(() => {
      void measureStep();
    }, 140);

    return () => {
      cancelled = true;
      clearTimeout(delayedMeasure);
    };
  }, [currentStep?.name, currentStep?.order, windowWidth]);

  const handleLayout = useCallback(() => {
    void applyHorizontalCorrection();
  }, [applyHorizontalCorrection]);
  // ─────────────────────────────────────────────────────────────────────────

  const availableTooltipWidth = (() => {
    if (!stepRect) {
      return currentStep?.name === 'subir-tab' ? 230 : windowWidth - 48;
    }

    const centerX = stepRect.x + stepRect.width / 2;
    const horizontalPosition = centerX > Math.abs(centerX - windowWidth) ? 'left' : 'right';

    if (horizontalPosition === 'left') {
      let right = Math.max(windowWidth - (stepRect.x + stepRect.width), 0);
      right = right === 0 ? right + COPILOT_MARGIN : right;
      return windowWidth - right - COPILOT_MARGIN;
    }

    let left = Math.max(stepRect.x, 0);
    left = left === 0 ? left + COPILOT_MARGIN : left;
    return windowWidth - left - COPILOT_MARGIN;
  })();

  const firstStepWidth = Math.min(320, windowWidth - 48);
  const preferredRegularWidth = currentStep?.name === 'subir-tab' ? 220 : 280;
  const regularTooltipWidth = clamp(
    Math.min(preferredRegularWidth, availableTooltipWidth - 6, windowWidth - 40),
    170,
    300,
  );

  const maxTooltipHeight = isFirstStep
    ? Math.min(windowHeight - 80, 520)
    : Math.min(windowHeight - 110, 340);
  const maxContentHeight = isFirstStep
    ? Math.max(170, maxTooltipHeight - 140)
    : Math.max(120, maxTooltipHeight - 120);

  const containerStyle = isFirstStep
    ? {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 30,
        width: firstStepWidth,
        maxHeight: maxTooltipHeight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
      }
    : {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 20,
        width: regularTooltipWidth,
        maxHeight: maxTooltipHeight,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      };

  const progressDots = (
    <View style={{
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: isFirstStep ? 'center' : 'flex-start',
      gap: 5,
      marginTop: 12,
      marginBottom: 4,
    }}>
      {Array.from({ length: totalSteps }).map((_, i) => (
        <View
          key={i}
          style={{
            height: 6,
            borderRadius: 3,
            width: i + 1 === currentNum ? 16 : 6,
            backgroundColor: i + 1 === currentNum ? '#e07a5f' : '#8B735540',
          }}
        />
      ))}
    </View>
  );

  return (
    <View
      ref={containerRef}
      onLayout={handleLayout}
      style={[
        containerStyle,
        { opacity: ready ? 1 : 0 },
        correctionX !== 0 && { transform: [{ translateX: correctionX }] },
      ]}
    >
      {/* Icono solo en el primer paso */}
      {isFirstStep && (
        <View style={{ alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 36 }}>{icon || '📚'}</Text>
        </View>
      )}

      <ScrollView
        style={{ maxHeight: maxContentHeight }}
        contentContainerStyle={{ paddingBottom: 4 }}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Título */}
        {title ? (
          <Text style={{
            fontSize: isFirstStep ? 17 : 15,
            color: '#3e2723',
            fontWeight: '700',
            fontFamily: 'Outfit_700Bold',
            textAlign: isFirstStep ? 'center' : 'left',
            marginBottom: 6,
          }}>
            {!isFirstStep && icon ? `${icon}  ${title}` : title}
          </Text>
        ) : null}

        {/* Cuerpo */}
        <Text style={{
          fontSize: isFirstStep ? 15 : 14,
          color: '#8B7355',
          lineHeight: isFirstStep ? 23 : 21,
          textAlign: isFirstStep ? 'center' : 'left',
          fontFamily: 'Outfit_400Regular',
        }}>
          {body}
        </Text>

        {progressDots}
      </ScrollView>

      <View style={{
        flexDirection: useCompactActionsLayout ? 'column' : 'row',
        justifyContent: useCompactActionsLayout ? 'flex-start' : 'space-between',
        alignItems: useCompactActionsLayout ? 'stretch' : 'center',
        marginTop: isFirstStep ? 16 : 12,
        flexWrap: useCompactActionsLayout ? 'nowrap' : 'wrap',
        gap: 8,
      }}>
        {!isLastStep ? (
          <TouchableOpacity
            onPress={() => stop()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              flexShrink: 1,
              alignSelf: useCompactActionsLayout ? 'flex-start' : 'auto',
            }}
          >
            <Text style={{ fontSize: 13, color: '#8B7355', fontWeight: '500' }}>
              Saltar tour
            </Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        <View style={{
          flexDirection: 'row',
          gap: 8,
          flexShrink: 1,
          width: useCompactActionsLayout ? '100%' : 'auto',
          justifyContent: useCompactActionsLayout ? 'space-between' : 'flex-start',
        }}>
          {!isFirstStep && (
            <TouchableOpacity
              onPress={() => goToPrev()}
              style={{
                backgroundColor: '#fdfbf7',
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#8B735520',
                flexShrink: 1,
                flexGrow: useCompactActionsLayout ? 1 : 0,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#8B7355', fontFamily: 'Outfit_700Bold' }}>
                Anterior
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => (isLastStep ? stop() : goToNext())}
            style={{
              backgroundColor: '#e07a5f',
              paddingHorizontal: isFirstStep ? 24 : 12,
              paddingVertical: isFirstStep ? 12 : 8,
              borderRadius: 999,
              shadowColor: '#e07a5f',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
              flexShrink: 1,
              flexGrow: useCompactActionsLayout ? 1 : 0,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff', fontFamily: 'Outfit_700Bold' }}>
              {isLastStep ? '¡Empezar!' : isFirstStep ? '¡Vamos allá!' : 'Siguiente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
