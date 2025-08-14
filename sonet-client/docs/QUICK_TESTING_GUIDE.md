# Quick Testing Guide - Advanced Media Carousel

## 🚀 **Quick Start Testing**

### **Prerequisites**
- Sonet client running (web or mobile)
- Access to composer functionality
- Test images/videos ready

### **1. Test Media Upload (10 Media Limit)**

#### **Step-by-Step:**
1. **Open Composer**
   - Navigate to create new post
   - Look for "Add Media" button

2. **Upload Multiple Media**
   - Tap "Add Media" button
   - Select 5-6 images/videos
   - Verify media count shows "5/10" or "6/10"

3. **Test Media Limit**
   - Try to add more media
   - Verify system prevents exceeding 10 items
   - Check error message appears

#### **Expected Results:**
- ✅ Media count indicator shows current/total
- ✅ "Manage Media" button appears after first upload
- ✅ System prevents exceeding 10 media limit
- ✅ Clear error message for limit reached

### **2. Test Media Manager**

#### **Step-by-Step:**
1. **Open Media Manager**
   - Tap "Manage Media" button
   - Verify dialog opens with media grid

2. **Test Drag & Drop**
   - Long press on media item
   - Drag to new position
   - Verify reordering works

3. **Test Media Removal**
   - Tap trash icon on media item
   - Confirm removal dialog
   - Verify item is removed

#### **Expected Results:**
- ✅ Media manager opens with visual grid
- ✅ Drag & drop reordering works
- ✅ Individual media removal works
- ✅ Clear all functionality works

### **3. Test Carousel Navigation (3+ Images)**

#### **Step-by-Step:**
1. **Upload 3+ Images**
   - Add 3-5 images to a post
   - Publish the post

2. **Navigate Carousel**
   - Swipe left/right on media
   - Look for navigation arrows
   - Check carousel indicators (dots)

3. **Test Media Counter**
   - Verify "3 / 5" style badge appears
   - Check counter updates during navigation

#### **Expected Results:**
- ✅ Carousel appears for 3+ images
- ✅ Swipe navigation works smoothly
- ✅ Navigation arrows visible
- ✅ Carousel indicators show position
- ✅ Media counter displays correctly

### **4. Test Pinch Gestures**

#### **Step-by-Step:**
1. **Pinch Together**
   - Use two fingers to pinch media together
   - Look for visual feedback
   - Check console for "Media combined" message

2. **Pinch Apart**
   - Pinch fingers apart
   - Look for return to normal state
   - Check console for "Media separated" message

#### **Expected Results:**
- ✅ Pinch together triggers combine mode
- ✅ Visual feedback appears
- ✅ Pinch apart returns to normal
- ✅ Console logs gesture events

### **5. Test Responsive Design**

#### **Step-by-Step:**
1. **Different Screen Sizes**
   - Test on mobile (portrait/landscape)
   - Test on tablet
   - Test on desktop (if web)

2. **Orientation Changes**
   - Rotate device
   - Verify layout adapts
   - Check carousel dimensions

#### **Expected Results:**
- ✅ Layout adapts to screen size
- ✅ Carousel dimensions adjust
- ✅ Media grid remains usable
- ✅ Navigation elements accessible

## 🧪 **Advanced Testing Scenarios**

### **Performance Testing**
- **Upload 10 High-Resolution Images**
  - Monitor memory usage
  - Check for performance degradation
  - Verify smooth animations

- **Rapid Gesture Testing**
  - Quick pinch gestures
  - Fast swipe navigation
  - Verify no lag or stuttering

### **Edge Case Testing**
- **Mixed Media Types**
  - Upload images + videos
  - Verify proper type indicators
  - Check handling of different formats

- **Accessibility Testing**
  - Screen reader compatibility
  - Keyboard navigation
  - High contrast mode

### **Integration Testing**
- **Lightbox Integration**
  - Tap on media items
  - Verify lightbox opens
  - Check navigation within lightbox

- **Feed Display**
  - View posts with multiple media
  - Verify carousel appears correctly
  - Test interaction with other feed elements

## 🐛 **Common Issues & Solutions**

### **Media Not Loading**
```
Issue: Media previews don't appear
Solution: Check network permissions, verify image URLs
```

### **Gestures Not Working**
```
Issue: Pinch/swipe gestures don't respond
Solution: Verify device supports touch events, check gesture handler
```

### **Performance Issues**
```
Issue: Slow animations or lag
Solution: Check memory usage, verify image sizes, test on different devices
```

### **Layout Problems**
```
Issue: Carousel layout broken
Solution: Check screen dimensions, verify responsive breakpoints
```

## 📊 **Testing Checklist**

### **Core Functionality**
- [ ] Upload 1-10 media items
- [ ] Media count indicator works
- [ ] Media manager opens
- [ ] Drag & drop reordering
- [ ] Individual media removal
- [ ] Clear all functionality

### **Carousel Features**
- [ ] Carousel appears for 3+ images
- [ ] Swipe navigation works
- [ ] Navigation arrows visible
- [ ] Carousel indicators work
- [ ] Media counter displays correctly

### **Gesture Support**
- [ ] Pinch to combine works
- [ ] Pinch to separate works
- [ ] Visual feedback appears
- [ ] Console logging works

### **Responsive Design**
- [ ] Mobile portrait layout
- [ ] Mobile landscape layout
- [ ] Tablet layout
- [ ] Desktop layout (web)

### **Integration**
- [ ] Lightbox integration
- [ ] Feed display
- [ ] Composer integration
- [ ] Error handling

## 🚨 **Critical Test Cases**

### **Must Pass Tests**
1. **Media Limit Enforcement**: System must prevent >10 media
2. **Carousel Navigation**: 3+ images must show carousel
3. **Gesture Recognition**: Pinch gestures must work
4. **Performance**: Animations must be smooth (60fps)
5. **Accessibility**: Screen reader and keyboard support

### **Regression Tests**
1. **Single Image Display**: Must work as before
2. **Two Image Grid**: Must work as before
3. **Lightbox Functionality**: Must work as before
4. **Existing Features**: No breaking changes

## 📱 **Device Testing Matrix**

| Device Type | OS Version | Test Priority | Notes |
|-------------|------------|---------------|-------|
| iPhone 14 | iOS 17+ | High | Primary mobile target |
| Samsung S23 | Android 13+ | High | Primary Android target |
| iPad Pro | iPadOS 17+ | Medium | Tablet testing |
| Desktop | Chrome/Safari | Low | Web compatibility |

## 🎯 **Success Criteria**

### **Functional Requirements**
- ✅ Upload up to 10 media items
- ✅ Carousel navigation for 3+ images
- ✅ Pinch gesture support
- ✅ Media management interface
- ✅ Responsive design

### **Performance Requirements**
- ✅ 60fps animations
- ✅ <100ms gesture response
- ✅ Smooth navigation
- ✅ Efficient memory usage

### **User Experience**
- ✅ Intuitive interface
- ✅ Professional appearance
- ✅ Smooth interactions
- ✅ Clear feedback

---

**Testing Status**: Ready for QA ✅  
**Last Updated**: December 2024  
**Test Environment**: Development/Staging