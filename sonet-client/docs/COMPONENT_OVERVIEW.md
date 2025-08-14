# Component Overview - Advanced Media Carousel

## 🏗️ **System Architecture**

```
┌─────────────────────────────────────────────────────────────────┐
│                    Advanced Media Carousel System               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │   Composer      │    │   Feed Display  │    │   Media     │ │
│  │   Integration   │    │   Integration   │    │   Upload    │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│           │                       │                       │     │
│           ▼                       ▼                       ▼     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │EnhancedSelect   │    │EnhancedImage    │    │Enhanced     │ │
│  │PhotoBtn         │    │Embed            │    │MediaUpload  │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│           │                       │                       │     │
│           ▼                       ▼                       ▼     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │MediaManager     │    │EnhancedGallery  │    │PinchGesture │ │
│  │Dialog           │    │                 │    │Handler      │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│           │                       │                       │     │
│           ▼                       ▼                       ▼     │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────┐ │
│  │AdvancedMedia    │    │ImageLayoutGrid  │    │Gallery      │ │
│  │Carousel         │    │                 │    │             │ │
│  └─────────────────┘    └─────────────────┘    └─────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 🔄 **Data Flow**

### **1. Media Upload Flow**
```
User Action → EnhancedSelectPhotoBtn → MediaManagerDialog → AdvancedMediaCarousel
     ↓              ↓                        ↓                    ↓
Media Selection → Media Preview → Media Management → Carousel Display
```

### **2. Feed Display Flow**
```
Note Content → EnhancedImageEmbed → EnhancedGallery → AdvancedMediaCarousel
     ↓              ↓                    ↓                    ↓
Media Data → Layout Decision → Smart Routing → Carousel/Grid
```

### **3. Gesture Interaction Flow**
```
User Gesture → PinchGestureHandler → AdvancedMediaCarousel → Creative Mode
     ↓              ↓                        ↓                    ↓
Touch Input → Gesture Recognition → State Update → Visual Feedback
```

## 📱 **Component Relationships**

### **Composer Layer**
```
Composer.tsx
├── EnhancedSelectPhotoBtn (replaces SelectPhotoBtn)
│   ├── Media count indicator
│   ├── Upload functionality
│   └── Media manager trigger
├── MediaManagerDialog
│   ├── Media grid display
│   ├── Drag & drop reordering
│   └── Media removal
└── State management
    ├── MAX_IMAGES = 10
    └── Media array management
```

### **Display Layer**
```
EnhancedImageEmbed.tsx
├── Single image → AutoSizedImage
├── Two images → ImageLayoutGrid
└── 3+ images → EnhancedGallery
    └── AdvancedMediaCarousel
        ├── Swipe navigation
        ├── Navigation arrows
        ├── Carousel indicators
        └── Media counter
```

### **Gesture Layer**
```
PinchGestureHandler.tsx
├── Gesture recognition
├── Scale calculations
├── Threshold checking
└── Callback triggers
    ├── onPinchCombine
    ├── onPinchSeparate
    └── Visual feedback
```

## 🔧 **Key Integration Points**

### **1. Composer Integration**
- **File**: `src/view/com/composer/Composer.tsx`
- **Changes**: 
  - Import `EnhancedSelectPhotoBtn`
  - Import `MediaManagerDialog`
  - Add media manager state
  - Update toolbar integration

### **2. Feed Integration**
- **File**: `src/components/Note/Embed/index.tsx`
- **Changes**:
  - Import `EnhancedImageEmbed`
  - Route images to enhanced component
  - Maintain existing functionality

### **3. Gallery Integration**
- **File**: `src/view/com/util/images/Gallery.tsx`
- **Changes**:
  - Add `EnhancedGallery` function
  - Smart layout switching logic
  - Pinch gesture integration

### **4. State Management**
- **File**: `src/view/com/composer/state/composer.ts`
- **Changes**:
  - Update `MAX_IMAGES` from 4 to 10
  - Maintain existing state structure

## 📊 **Component Dependencies**

### **Core Dependencies**
```typescript
// Required packages
"react-native-reanimated": "^3.0.0"
"react-native-gesture-handler": "^2.0.0"
"expo-image": "^1.0.0"
"@fortawesome/react-native-fontawesome": "^0.3.0"
```

### **Internal Dependencies**
```typescript
// Sonet internal components
"#/alf"                    // Design system
"#/components/Button"      // UI components
"#/components/Typography"  // Text components
"#/state/gallery"          // Media state
"#/lib/media/picker"       // Media selection
```

### **Component Dependencies**
```
AdvancedMediaCarousel
├── PinchGestureHandler
├── React Native Reanimated
├── Expo Image
└── Sonet Design System

MediaManagerDialog
├── DraggableFlatList
├── FontAwesome Icons
├── Sonet Components
└── State Management

EnhancedSelectPhotoBtn
├── Image Picker
├── Permission Hooks
├── State Management
└── UI Components
```

## 🎯 **Component Responsibilities**

### **EnhancedSelectPhotoBtn**
- **Primary**: Media selection and upload
- **Secondary**: Media count display
- **Tertiary**: Media manager integration

### **MediaManagerDialog**
- **Primary**: Media management interface
- **Secondary**: Drag & drop reordering
- **Tertiary**: Media removal and clearing

### **AdvancedMediaCarousel**
- **Primary**: Carousel display and navigation
- **Secondary**: Gesture handling
- **Tertiary**: UI indicators and feedback

### **PinchGestureHandler**
- **Primary**: Gesture recognition
- **Secondary**: State management
- **Tertiary**: Visual feedback

### **EnhancedGallery**
- **Primary**: Layout decision making
- **Secondary**: Component routing
- **Tertiary**: Integration management

### **EnhancedImageEmbed**
- **Primary**: Feed media display
- **Secondary**: Layout switching
- **Tertiary**: Lightbox integration

## 🔄 **State Management Flow**

### **Composer State**
```typescript
interface ComposerState {
  thread: ThreadDraft
  activeNoteIndex: number
  // Media state managed in individual notes
}

interface NoteDraft {
  embed: {
    media: ImagesMedia | VideoMedia | GifMedia | undefined
  }
}

interface ImagesMedia {
  type: 'images'
  images: ComposerImage[]  // Up to 10 items
}
```

### **Media State Flow**
```
User Selection → ComposerImage[] → NoteDraft → ThreadDraft → Display
     ↓              ↓                ↓           ↓           ↓
File Picker → Media Objects → Note State → Thread State → UI Render
```

### **Gesture State**
```typescript
interface GestureState {
  scale: number
  isCombined: boolean
  hasTriggeredAction: boolean
}
```

## 🧪 **Testing Integration Points**

### **Unit Testing**
- **Component**: Test individual components in isolation
- **Props**: Verify prop interfaces and validation
- **State**: Test state management and updates

### **Integration Testing**
- **Composer**: Test media upload flow
- **Feed**: Test display and interaction
- **Gestures**: Test gesture recognition and response

### **End-to-End Testing**
- **Complete Flow**: Upload → Manage → Display → Interact
- **User Scenarios**: Real-world usage patterns
- **Performance**: Load testing with multiple media

## 🚀 **Performance Considerations**

### **Memory Management**
- **Image Caching**: Efficient thumbnail and full-size handling
- **Lazy Loading**: Load media on demand
- **Cleanup**: Proper disposal of media resources

### **Animation Performance**
- **60fps Target**: Smooth gesture and navigation animations
- **Gesture Optimization**: Efficient touch event handling
- **Render Optimization**: Minimize unnecessary re-renders

### **Bundle Size**
- **Tree Shaking**: Remove unused code
- **Dynamic Imports**: Load heavy components on demand
- **Dependency Optimization**: Minimize external dependencies

## 🔮 **Future Extension Points**

### **Creative Layouts (Phase 2)**
- **Grid Variations**: Extend `AdvancedMediaCarousel`
- **Story Mode**: Add vertical scrolling layouts
- **Timeline Mode**: Add horizontal scrolling layouts

### **Advanced Features (Phase 3)**
- **Media Effects**: Extend `MediaManagerDialog`
- **Collaboration**: Add sharing and editing features
- **Analytics**: Track usage and performance metrics

### **Performance Enhancements (Phase 4)**
- **Virtual Scrolling**: Handle large media collections
- **Advanced Caching**: Implement sophisticated caching strategies
- **Progressive Enhancement**: Add features based on device capability

---

**Document Version**: 1.0.0  
**Last Updated**: December 2024  
**Maintainer**: Sonet Development Team  
**Status**: Production Ready ✅