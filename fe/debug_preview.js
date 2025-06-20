// Debug script cho PreviewFormPage issues
// Paste code này vào browser console để debug

console.log('🚀 STARTING PREVIEW DEBUG...');

// Check 1: Kiểm tra formId từ URL
const currentUrl = window.location.href;
const formIdMatch = currentUrl.match(/\/preview-form\/([^\/\?]+)/);
console.log('📋 Form ID từ URL:', formIdMatch ? formIdMatch[1] : 'KHÔNG TÌM THẤY');

// Check 2: Kiểm tra localStorage userInfo
const userInfo = localStorage.getItem('userInfo');
console.log('👤 User Info:', userInfo ? JSON.parse(userInfo) : 'KHÔNG CÓ');

// Check 3: Kiểm tra container ref
const containers = document.querySelectorAll('[class*="form-content"], .form-content, #content');
console.log('📦 Containers found:', containers.length);
containers.forEach((container, index) => {
  console.log(`Container ${index}:`, {
    element: container,
    innerHTML_length: container.innerHTML.length,
    hasContent: container.innerHTML.length > 100
  });
});

// Check 4: Kiểm tra loading states
const loadingElements = document.querySelectorAll('.ant-spin, [class*="loading"], .loading');
console.log('⏳ Loading elements:', loadingElements.length);

// Check 5: Kiểm tra network requests
console.log('🌐 Checking recent network requests...');
if (window.performance && window.performance.getEntries) {
  const recentRequests = window.performance.getEntries()
    .filter(entry => entry.name.includes('api') || entry.name.includes('form'))
    .slice(-10);
  
  recentRequests.forEach(request => {
    console.log('📡 Request:', {
      url: request.name,
      duration: request.duration,
      responseStart: request.responseStart,
      status: request.responseStatus || 'unknown'
    });
  });
}

// Check 6: Kiểm tra React component states
const reactFiberKey = Object.keys(document.body).find(key => key.startsWith('__reactInternalInstance'));
if (reactFiberKey) {
  console.log('⚛️ React fiber key found:', reactFiberKey);
} else {
  console.log('⚛️ No React fiber key found');
}

// Check 7: Kiểm tra errors trong console
console.log('❌ Errors có thể check:');
console.log('1. Network tab - có request nào fail không?');
console.log('2. Console tab - có error JS nào không?');
console.log('3. Elements tab - DOM có được render không?');
console.log('4. Application tab - localStorage có đúng không?');

// Check 8: Test API call manually
async function testFormApi() {
  const formId = formIdMatch ? formIdMatch[1] : 'TEST-ID';
  console.log('🧪 Testing API call for formId:', formId);
  
  try {
    const response = await fetch(`/api/Form/form-info/${formId}`, {
      headers: {
        'Authorization': `Bearer ${JSON.parse(userInfo || '{}').token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('📊 API Response status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API Data:', data);
    } else {
      console.log('❌ API Error:', response.statusText);
    }
  } catch (error) {
    console.log('💥 API Call Failed:', error);
  }
}

// Run the test
if (formIdMatch && userInfo) {
  testFormApi();
} else {
  console.log('⚠️ Cannot test API - missing formId or userInfo');
}

console.log('🏁 DEBUG COMPLETED. Check logs above for issues.'); 