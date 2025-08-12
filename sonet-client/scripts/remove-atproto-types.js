#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Type mapping from AT Protocol to Sonet
const typeMappings = {
  // Feed types
  'AppBskyFeedDefs.PostView': 'SonetPost',
  'AppBskyFeedDefs.GeneratorView': 'SonetFeedGenerator',
  'AppBskyFeedDefs.ThreadViewPost': 'SonetThreadViewPost',
  'AppBskyFeedDefs.FeedViewPost': 'SonetFeedViewPost',
  'AppBskyFeedDefs.ReasonRepost': 'SonetReason',
  'AppBskyFeedDefs.Interaction': 'SonetInteraction',
  
  // Post types
  'AppBskyFeedPost.Record': 'SonetPostRecord',
  'AppBskyFeedPost': 'SonetPost',
  
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
  'AppBskyFeedDefs.isReasonRepost': 'SonetUtils.isReasonRepost',
  'AppBskyFeedDefs.isThreadViewPost': 'SonetUtils.isThreadViewPost',
  'AppBskyFeedDefs.isGeneratorView': 'SonetUtils.isGeneratorView',
  'AppBskyFeedPost.isRecord': 'SonetUtils.isPostRecord',
  'AppBskyFeedPost.validateRecord': 'SonetUtils.validatePostRecord',
  
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
  'src/state/queries/post-feed.ts',
  'src/view/com/feeds/FeedPage.tsx',
  'src/view/com/posts/PostFeed.tsx',
  'src/view/com/post/Post.tsx',
  'src/view/com/post-thread/PostThreadItem.tsx',
  'src/screens/PostThread/components/ThreadItemPost.tsx',
  'src/screens/PostThread/components/ThreadItemTreePost.tsx',
  'src/screens/PostThread/components/ThreadItemAnchor.tsx',
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
      'import { type SonetPost, type SonetProfile, type SonetFeedGenerator, type SonetPostRecord, type SonetFeedViewPost, type SonetInteraction, type SonetSavedFeed } from \'#/types/sonet\''
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