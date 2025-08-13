#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Type mapping from AT Protocol to Sonet
const typeMappings = {
  // Feed types
  'AppBskyFeedDefs.NoteView': 'SonetNote',
  'AppBskyFeedDefs.GeneratorView': 'SonetFeedGenerator',
  'AppBskyFeedDefs.ThreadViewNote': 'SonetThreadViewNote',
  'AppBskyFeedDefs.FeedViewNote': 'SonetFeedViewNote',
  'AppBskyFeedDefs.ReasonRenote': 'SonetReason',
  'AppBskyFeedDefs.Interaction': 'SonetInteraction',
  
  // Note types
  'AppBskyFeedNote.Record': 'SonetNoteRecord',
  'AppBskyFeedNote': 'SonetNote',
  
  // Actor types
  'AppBskyActorDefs.ProfileView': 'SonetProfile',
  'AppBskyActorDefs.ProfileViewBasic': 'SonetProfile',
  'AppBskyActorDefs.SavedFeed': 'SonetSavedFeed',
  
  // Graph types
  'AppBskyGraphDefs.ListView': 'SonetListView',
  
  // Constants
  'AppBskyFeedDefs.CONTENTMODEVIDEO': "'video'",
  'AppBskyFeedDefs.CONTENTMODETEXT': "'text'",
  'AppBskyFeedDefs.CONTENTMODEIMAGES': "'images'",
  
  // Functions
  'AppBskyFeedDefs.isReasonRenote': 'SonetUtils.isReasonRenote',
  'AppBskyFeedDefs.isThreadViewNote': 'SonetUtils.isThreadViewNote',
  'AppBskyFeedDefs.isGeneratorView': 'SonetUtils.isGeneratorView',
  'AppBskyFeedNote.isRecord': 'SonetUtils.isNoteRecord',
  'AppBskyFeedNote.validateRecord': 'SonetUtils.validateNoteRecord',
  
  // URI types
  'AtUri': 'SonetUri',
  
  // Rich text
  'RichText': 'string',
  
  // Moderation
  'ModerationDecision': 'SonetModerationDecision',
  'ModerationPrefs': 'SonetModerationPrefs',
  
  // Agent
  'BskyAgent': 'SonetAgent',
};

// Files to process
const filesToProcess = [
  'src/state/queries/feed.ts',
  'src/state/queries/note-feed.ts',
  'src/view/com/feeds/FeedPage.tsx',
  'src/view/com/notes/NoteFeed.tsx',
  'src/view/com/note/Note.tsx',
  'src/view/com/note-thread/NoteThreadItem.tsx',
  'src/screens/NoteThread/components/ThreadItemNote.tsx',
  'src/screens/NoteThread/components/ThreadItemTreeNote.tsx',
  'src/screens/NoteThread/components/ThreadItemAnchor.tsx',
  'src/screens/VideoFeed/index.tsx',
  'src/screens/Search/Explore.tsx',
  'src/screens/Search/SearchResults.tsx',
  'src/screens/Profile/ProfileFeed/index.tsx',
  'src/view/screens/Feeds.tsx',
  'src/view/com/feeds/FeedSourceCard.tsx',
];

function processFile(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Replace type imports
  if (content.includes('@atproto/api')) {
    content = content.replace(
      /import\s*{[^}]*}\s*from\s*['"]@atproto\/api['"]/g,
      'import { type SonetNote, type SonetProfile, type SonetFeedGenerator, type SonetNoteRecord, type SonetFeedViewNote, type SonetInteraction, type SonetSavedFeed } from \'#/types/sonet\''
    );
    changed = true;
  }
  
  // Replace individual types
  Object.entries(typeMappings).forEach(([oldType, newType]) => {
    const regex = new RegExp(`\\b${oldType.replace(/\./g, '\\.')}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, newType);
      changed = true;
    }
  });
  
  // Replace content mode constants
  content = content.replace(
    /AppBskyFeedDefs\.CONTENTMODEVIDEO/g,
    "'video'"
  );
  content = content.replace(
    /AppBskyFeedDefs\.CONTENTMODETEXT/g,
    "'text'"
  );
  content = content.replace(
    /AppBskyFeedDefs\.CONTENTMODEIMAGES/g,
    "'images'"
  );
  
  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  } else {
    console.log(`No changes needed: ${filePath}`);
  }
}

// Process all files
filesToProcess.forEach(processFile);

console.log('\nAT Protocol type removal script completed!');
console.log('Note: You may need to manually review and fix some type issues.');
console.log('Consider creating additional Sonet utility functions for type checking.');