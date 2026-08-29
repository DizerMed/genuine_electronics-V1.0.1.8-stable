const fs = require('fs');

const files = [
  'src/components/Navbar.tsx',
  'src/components/AuthScreen.tsx',
  'src/components/InstallPwaBanner.tsx',
  'src/components/AdminPortal.tsx',
  'src/components/ClientProfileModal.tsx',
  'src/App.tsx',
  'src/lib/useSupabase.ts',
  'src/lib/visitorTrackingService.ts',
  'src/hooks/useLoanAlerts.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Add import if not present
  if (!content.includes('safeLocalStorage') && content.includes('localStorage')) {
    // Find how many levels up to go
    const levels = file.split('/').length - 2; // src/components/Navbar.tsx -> 2 levels -> ../utils/storage
    const prefix = levels === 1 ? '../' : levels === 2 ? '../../' : './';
    let importPath = prefix + 'utils/storage';
    
    // For App.tsx in src/
    if (file === 'src/App.tsx') importPath = './utils/storage';
    if (file === 'src/lib/useSupabase.ts') importPath = '../utils/storage';
    if (file === 'src/lib/visitorTrackingService.ts') importPath = '../utils/storage';
    if (file === 'src/hooks/useLoanAlerts.tsx') importPath = '../utils/storage';
    if (file.startsWith('src/components/')) importPath = '../utils/storage';

    const importStmt = `import { safeLocalStorage } from '${importPath}';\n`;
    
    // Insert after last import
    const lastImportIndex = content.lastIndexOf('import ');
    if (lastImportIndex !== -1) {
      const endOfImport = content.indexOf('\n', lastImportIndex);
      content = content.slice(0, endOfImport + 1) + importStmt + content.slice(endOfImport + 1);
    } else {
      content = importStmt + content;
    }
  }

  // Replace localStorage. with safeLocalStorage.
  content = content.replace(/localStorage\.(getItem|setItem|removeItem)/g, 'safeLocalStorage.$1');
  
  // Fix the typeof localStorage in AdminPortal
  if (file === 'src/components/AdminPortal.tsx') {
    content = content.replace(/typeof localStorage !== 'undefined' \? safeLocalStorage\.getItem/g, "typeof window !== 'undefined' ? safeLocalStorage.getItem");
  }

  fs.writeFileSync(file, content);
}
console.log('Done replacing localStorage');
