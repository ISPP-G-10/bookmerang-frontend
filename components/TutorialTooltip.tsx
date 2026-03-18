import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useCopilot } from 'react-native-copilot';

export default function TutorialTooltip() {
  const { currentStep, isFirstStep, isLastStep, goToNext, goToPrev, stop } = useCopilot();

  const containerStyle = isFirstStep 
    ? { 
        backgroundColor: '#ffffff', 
        borderRadius: 24, 
        padding: 30, 
        width: 320,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 10,
      } 
    : { 
        backgroundColor: '#ffffff', 
        borderRadius: 16, 
        padding: 20, 
        maxWidth: 300,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      };

  return (
    <View style={containerStyle}>
      {isFirstStep && (
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <View style={{ 
            backgroundColor: '#fdfbf7', 
            width: 80, 
            height: 80, 
            borderRadius: 40, 
            alignItems: 'center', 
            justifyContent: 'center',
            borderWidth: 2,
            borderColor: '#e07a5f'
          }}>
            <Text style={{ fontSize: 40 }}>📚</Text>
          </View>
        </View>
      )}
      
      <Text style={{ 
        fontSize: isFirstStep ? 17 : 15, 
        color: '#3e2723', 
        lineHeight: isFirstStep ? 26 : 22,
        textAlign: isFirstStep ? 'center' : 'left',
        fontWeight: isFirstStep ? '500' : 'normal'
      }}>
        {currentStep?.text ?? ''}
      </Text>

      <View style={{ 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginTop: isFirstStep ? 24 : 16 
      }}>
        {!isLastStep ? (
          <TouchableOpacity onPress={() => stop()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={{ fontSize: 13, color: '#8B7355', fontWeight: '500' }}>Saltar tour</Text>
          </TouchableOpacity>
        ) : (
          <View />
        )}

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {!isFirstStep && (
            <TouchableOpacity
              onPress={() => goToPrev()}
              style={{
                backgroundColor: '#fdfbf7',
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: '#8B735520'
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#8B7355' }}>Anterior</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => (isLastStep ? stop() : goToNext())}
            style={{
              backgroundColor: '#e07a5f',
              paddingHorizontal: isFirstStep ? 24 : 16,
              paddingVertical: isFirstStep ? 12 : 8,
              borderRadius: 999,
              shadowColor: "#e07a5f",
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 3,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#ffffff' }}>
              {isLastStep ? '¡Empezar!' : isFirstStep ? '¡Vamos allá!' : 'Siguiente'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
