package main

import (
	"encoding/json"
	"io"
	"os"
	"strings"
	"testing"

	appbsky "github.com/bluesky-social/indigo/api/bsky"
)

func loadNote(t *testing.T, p string) appbsky.FeedNote {

	f, err := os.Open(p)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = f.Close() }()

	noteBytes, err := io.ReadAll(f)
	if err != nil {
		t.Fatal(err)
	}
	var note appbsky.FeedNote
	if err := json.Unmarshal(noteBytes, &note); err != nil {
		t.Fatal(err)
	}
	return note
}

func TestExpandNoteText(t *testing.T) {
	note := loadNote(t, "testdata/atproto_embed_note.json")

	text := ExpandNoteText(&note)
	if !strings.Contains(text, "https://github.com/snarfed/bridgy-fed") {
		t.Fail()
	}
}
