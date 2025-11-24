#!/bin/bash
files=(
  "src/components/documents/VersionControls.tsx"
  "src/components/ui/ThemeToggle.tsx"
  "src/components/modals/WelcomeModal.tsx"
  "src/components/ui/MenuButton.tsx"
  "src/components/documents/DocumentVersions.tsx"
  "src/components/modals/VersionHistoryModal.tsx"
  "src/components/layout/DashboardLayout.tsx"
  "src/App.tsx"
  "src/components/documents/VersionHistory.tsx"
  "src/components/documents/DocumentTabs.tsx"
  "src/components/editor/CodeMirrorEditor.tsx"
  "src/components/sidebar/FileSidebar.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file"
    # Use sed to add type="button" to button elements without type
    # This is a bit tricky with sed, so let's use a more reliable approach
    node -e "
      const fs = require('fs');
      const path = '$file';
      let content = fs.readFileSync(path, 'utf8');
      const originalLength = content.length;
      // Match button tags without type attribute
      content = content.replace(/<button(?!\s+type)([^>]*?>)/g, '<button type=\"button\"\$1');
      const replacements = Math.floor((content.length - originalLength) / 23);
      if (replacements > 0) {
        console.log('  Fixed ' + replacements + ' buttons in ' + path);
        fs.writeFileSync(path, content);
      } else {
        console.log('  No buttons to fix in ' + path);
      }
    "
  else
    echo "File not found: $file"
  fi
done
