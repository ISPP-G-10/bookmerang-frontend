# 📱 Bookmerang Frontend

Aplicación móvil y web desarrollada con **Expo**, **React Native**, **TypeScript** y **NativeWind (Tailwind CSS)**.

---

## 📋 Requisitos Previos

### Para ejecución local:
- **Node.js 18+** - [Descargar aquí](https://nodejs.org/)
- **npm** o **yarn** (incluido con Node.js)
- **Expo Go App** (para móvil) - [iOS](https://apps.apple.com/app/expo-go/id982107779) | [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)

### Para ejecución con Docker:
- **Docker Desktop** - [Descargar aquí](https://www.docker.com/products/docker-desktop)

---

## 🚀 Instalación y Ejecución Local

### 1️⃣ Ir a la carpeta del proyecto
```bash
cd bookmerang-frontend
```

### 2️⃣ Instalar dependencias
```bash
npm install
```

### 3️⃣ Configurar variables de entorno
Editar el archivo `.env`:
```env
EXPO_PUBLIC_API_URL=http://localhost:5044
```

### 4️⃣ Iniciar el servidor de desarrollo
```bash
npm start
```

### 5️⃣ Ejecutar en diferentes plataformas

#### 📱 **En dispositivo móvil (iOS/Android)**
1. Instala **Expo Go** en tu dispositivo
2. Escanea el código QR que aparece en la terminal
3. La app se cargará automáticamente

#### 🌐 **En navegador web**
```bash
npm run web
```
Abrirá automáticamente en `http://localhost:8081`

#### 🤖 **En emulador Android**
```bash
npm run android
```
Requiere **Android Studio** y emulador configurado.

#### 🍎 **En simulador iOS (solo macOS)**
```bash
npm run ios
```
Requiere **Xcode** instalado.

---

## 🐳 Ejecución con Docker (Producción)

### 1️⃣ Construir la imagen
```bash
docker build -t bookmerang-frontend .
```

### 2️⃣ Ejecutar el contenedor
```bash
docker run -p 3000:80 --name bookmerang-app bookmerang-frontend
```

### 3️⃣ Acceder a la aplicación
Abrir en navegador: `http://localhost:3000`

### Comandos útiles:
```bash
# Ver contenedores corriendo
docker ps

# Ver logs
docker logs bookmerang-app

# Detener contenedor
docker stop bookmerang-app

# Eliminar contenedor
docker rm bookmerang-app

# Reconstruir (después de cambios)
docker build -t bookmerang-frontend . && docker run -p 3000:80 bookmerang-app

# Ejecutar en segundo plano
docker run -d -p 3000:80 --name bookmerang-app bookmerang-frontend
```

---

## 📁 Estructura del Proyecto

```
bookmerang-frontend/
├── app/                    # 📱 Rutas (Expo Router - file-based)
│   ├── (tabs)/            # Navegación con tabs
│   │   ├── index.tsx      # Home
│   │   └── two.tsx        # Otra pantalla
│   ├── _layout.tsx        # Layout principal
│   └── +not-found.tsx     # Página 404
├── components/            # 🧩 Componentes reutilizables
├── constants/             # 📌 Constantes (colores, config)
├── lib/                   # 📚 Configuraciones y helpers
├── assets/               # 🎨 Recursos estáticos
│   ├── fonts/
│   └── images/
├── .env                  # 🔐 Variables de entorno
└── Dockerfile            # 🐳 Configuración Docker
```

---

## 🔧 Configuración

### Variables de Entorno
Archivo `.env`:
```env
# URL del backend
EXPO_PUBLIC_API_URL=http://localhost:5044
```

### Tailwind CSS (NativeWind)
Configurado en `tailwind.config.js`. Usar clases de Tailwind directamente:
```tsx
<View className="flex-1 bg-blue-500 p-4">
  <Text className="text-white text-xl font-bold">Hola</Text>
</View>
```

---

## 🛠️ Desarrollo

### Scripts disponibles:
```bash
# Iniciar servidor de desarrollo
npm start

# Ejecutar en web
npm run web

# Ejecutar en Android
npm run android

# Ejecutar en iOS
npm run ios

---

## 🎨 Componentes y Estilos

### Usando NativeWind (Tailwind):
```tsx
import { View, Text } from 'react-native';

export default function MyComponent() {
  return (
    <View className="flex-1 items-center justify-center bg-gray-100">
      <Text className="text-2xl font-bold text-blue-600">
        Bookmerang
      </Text>
    </View>
  );
}
```

---

## 🧪 Testing

```bash
# Ejecutar tests
npm test

# Con watch mode
npm test -- --watch
```

---

## 📦 Build de Producción

### Web:
```bash
npx expo export -p web
```
Genera archivos en `dist/`

### Android APK:
```bash
eas build --platform android
```
Requiere configurar EAS Build.

### iOS:
```bash
eas build --platform ios
```
Requiere cuenta de Apple Developer.

---

## 📝 Notas Importantes

- **Puerto de desarrollo**: `8081`
- **Puerto de producción (Docker)**: `3000` (mapeado a 80 interno)
- El backend debe estar corriendo en `http://localhost:5044`
- Expo Router usa **file-based routing** (rutas basadas en archivos)
- NativeWind permite usar Tailwind CSS en React Native

---

### Error de conexión con API
Verificar que:
1. El backend esté corriendo
2. La URL en `.env` sea correcta
3. CORS esté configurado en el backend

---