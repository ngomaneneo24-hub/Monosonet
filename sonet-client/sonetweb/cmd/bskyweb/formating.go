package main

import (
	"fmt"
	"slices"
	"strings"

	appbsky "github.com/bluesky-social/indigo/api/bsky"
)

// Function to expand shortened links in rich text back to full urls, replacing shortened urls in social card meta tags and the noscript output.
//
// This essentially reverses the effect of the typescript function `shortenLinks()` in `src/lib/strings/rich-text-manip.ts`
func ExpandNoteText(note *appbsky.FeedNote) string {
	noteText := note.Text
	var charsAdded int = 0
	// iterate over facets, check if they're link facets, and if found, grab the uri
	for _, facet := range note.Facets {
		linkUri := ""
		if slices.ContainsFunc(facet.Features, func(feat *appbsky.RichtextFacet_Features_Elem) bool {
			if feat.RichtextFacet_Link == nil || feat.RichtextFacet_Link.LexiconTypeID != "app.bsky.richtext.facet#link" {
				return false
			}

			// bail out if bounds checks fail
			if facet.Index.ByteStart > facet.Index.ByteEnd ||
				int(facet.Index.ByteStart)+charsAdded > len(noteText) ||
				int(facet.Index.ByteEnd)+charsAdded > len(noteText) {
				return false
			}
			linkText := noteText[int(facet.Index.ByteStart)+charsAdded : int(facet.Index.ByteEnd)+charsAdded]
			linkUri = feat.RichtextFacet_Link.Uri

			// only expand uris that have been shortened (as opposed to those with non-uri anchor text)
			if strings.HasSuffix(linkText, "...") && strings.Contains(linkUri, linkText[0:len(linkText)-3]) {
				return true
			}
			return false
		}) {
			// replace the shortened uri with the full length one from the facet using utf8 byte offsets
			// NOTE: we already did bounds check above
			noteText = noteText[0:int(facet.Index.ByteStart)+charsAdded] + linkUri + noteText[int(facet.Index.ByteEnd)+charsAdded:]
			charsAdded += len(linkUri) - int(facet.Index.ByteEnd-facet.Index.ByteStart)
		}
	}
	// if the note has an embeded link and its url doesn't already appear in noteText, append it to
	// the end to avoid social cards with missing links
	if note.Embed != nil && note.Embed.EmbedExternal != nil && note.Embed.EmbedExternal.External != nil {
		externalURI := note.Embed.EmbedExternal.External.Uri
		if !strings.Contains(noteText, externalURI) {
			noteText = fmt.Sprintf("%s\n%s", noteText, externalURI)
		}
	}
	// TODO: could embed the actual note text?
	if note.Embed != nil && (note.Embed.EmbedRecord != nil || note.Embed.EmbedRecordWithMedia != nil) {
		noteText = fmt.Sprintf("%s\n\n[contains quote note or other embedded content]", noteText)
	}
	return noteText
}
