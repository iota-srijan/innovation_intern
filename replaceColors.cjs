const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const replacements = [
  // VIOLET/PURPLE -> ORANGE
  { regex: /\bviolet-700\b/g, replace: 'orange-500' },
  { regex: /\bviolet-600\b/g, replace: 'orange-500' },
  { regex: /\bviolet-500\b/g, replace: 'orange-400' },
  { regex: /\bviolet-400\b/g, replace: 'orange-300' },
  { regex: /\bviolet-300\b/g, replace: 'orange-200' },
  { regex: /\bviolet-200\b/g, replace: 'orange-200' },
  { regex: /\bviolet-100\b/g, replace: 'orange-100' },
  { regex: /\bviolet-50\b/g, replace: 'orange-50' },
  
  { regex: /\bindigo-600\b/g, replace: 'orange-500' },
  { regex: /\bindigo-500\b/g, replace: 'orange-400' },
  { regex: /\bindigo-400\b/g, replace: 'orange-300' },
  { regex: /\bindigo-300\b/g, replace: 'orange-200' },
  { regex: /\bindigo-200\b/g, replace: 'orange-200' },
  { regex: /\bindigo-100\b/g, replace: 'orange-100' },
  { regex: /\bindigo-50\b/g, replace: 'orange-50' },
  
  { regex: /\bpurple-700\b/g, replace: 'orange-500' },
  { regex: /\bpurple-600\b/g, replace: 'orange-500' },
  { regex: /\bpurple-500\b/g, replace: 'orange-400' },
  { regex: /\bpurple-400\b/g, replace: 'orange-300' },
  { regex: /\bpurple-300\b/g, replace: 'orange-200' },
  { regex: /\bpurple-200\b/g, replace: 'orange-200' },
  { regex: /\bpurple-100\b/g, replace: 'orange-100' },
  { regex: /\bpurple-50\b/g, replace: 'orange-50' },
  
  // Hex replacements
  { regex: /#7c3aed/gi, replace: '#f97316' },
  { regex: /#8b5cf6/gi, replace: '#f97316' },
  { regex: /#6d28d9/gi, replace: '#f97316' },

  // Dark mode backgrounds
  { regex: /bg-\[\#0a0a0b\]/g, replace: 'bg-[#0d0a08]' },
  { regex: /#0a0a0b/g, replace: '#0d0a08' },
  { regex: /bg-\[\#111114\]/g, replace: 'bg-[#1a1108]' },
  { regex: /#111114/g, replace: '#1a1108' },
  { regex: /bg-\[\#111111\]/g, replace: 'bg-[#1a1108]' },
  { regex: /#111111/g, replace: '#1a1108' },
  { regex: /bg-\[\#1a1a1a\]/g, replace: 'bg-[#1f1509]' },
  { regex: /#1a1a1a/g, replace: '#1f1509' },
  { regex: /\bborder-zinc-800\b/g, replace: 'border-orange-950/30' },
  
  // Light mode zinc-50
  { regex: /\bbg-zinc-50\b/g, replace: 'bg-orange-50' },
  { regex: /\bborder-zinc-200\b/g, replace: 'border-orange-100' },

  // Index.css specific
  { regex: /#7c3aed40/g, replace: '#f9731640' },
  { regex: /#ddd6fe/g, replace: '#fed7aa' },

  // Admin badge specific
  { regex: /admin:\s*'text-amber-400 bg-amber-400\/10 border-amber-400\/20'/g, replace: "admin:    'text-orange-400 bg-orange-400/10 border-orange-400/20'" }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts') || fullPath.endsWith('.css') || fullPath.endsWith('.js')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let newContent = content;
      
      for (const { regex, replace } of replacements) {
        newContent = newContent.replace(regex, replace);
      }
      
      if (content !== newContent) {
        fs.writeFileSync(fullPath, newContent, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(srcDir);
console.log('Replacement complete.');
