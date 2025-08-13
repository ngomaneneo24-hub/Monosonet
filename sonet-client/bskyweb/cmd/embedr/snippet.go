package main

import (
	"bytes"
	"fmt"
	"html/template"

	appbsky "github.com/bluesky-social/indigo/api/bsky"
	"github.com/bluesky-social/indigo/atproto/syntax"
)

func (srv *Server) noteEmbedHTML(noteView *appbsky.FeedDefs_NoteView) (string, error) {
	// ensure that there isn't an injection from the URI
	aturi, err := syntax.ParseATURI(noteView.Uri)
	if err != nil {
		log.Error("bad AT-URI in reponse", "aturi", aturi, "err", err)
		return "", err
	}

	note, ok := noteView.Record.Val.(*appbsky.FeedNote)
	if !ok {
		log.Error("bad note record value", "err", err)
		return "", err
	}

	const tpl = `<blockquote class="bluesky-embed" data-bluesky-uri="{{ .NoteURI }}" data-bluesky-cid="{{ .NoteCID }}"><p{{ if .NoteLang }} lang="{{ .NoteLang }}"{{ end }}>{{ .NoteText }}</p>&mdash; <a href="{{ .ProfileURL }}">{{ .NoteAuthor }}</a> <a href="{{ .NoteURL }}">{{ .NoteIndexedAt }}</a></blockquote><script async src="{{ .WidgetURL }}" charset="utf-8"></script>`

	t, err := template.New("snippet").Parse(tpl)
	if err != nil {
		log.Error("template parse error", "err", err)
		return "", err
	}

	sortAt := noteView.IndexedAt
	createdAt, err := syntax.ParseDatetime(note.CreatedAt)
	if nil == err && createdAt.String() < sortAt {
		sortAt = createdAt.String()
	}

	var lang string
	if len(note.Langs) > 0 {
		lang = note.Langs[0]
	}
	var authorName string
	if noteView.Author.DisplayName != nil {
		authorName = fmt.Sprintf("%s (@%s)", *noteView.Author.DisplayName, noteView.Author.Handle)
	} else {
		authorName = fmt.Sprintf("@%s", noteView.Author.Handle)
	}
	data := struct {
		NoteURI       template.URL
		NoteCID       string
		NoteLang      string
		NoteText      string
		NoteAuthor    string
		NoteIndexedAt string
		ProfileURL    template.URL
		NoteURL       template.URL
		WidgetURL     template.URL
	}{
		NoteURI:       template.URL(noteView.Uri),
		NoteCID:       noteView.Cid,
		NoteLang:      lang,
		NoteText:      note.Text,
		NoteAuthor:    authorName,
		NoteIndexedAt: sortAt,
		ProfileURL:    template.URL(fmt.Sprintf("https://bsky.app/profile/%s?ref_src=embed", aturi.Authority())),
		NoteURL:       template.URL(fmt.Sprintf("https://bsky.app/profile/%s/note/%s?ref_src=embed", aturi.Authority(), aturi.RecordKey())),
		WidgetURL:     template.URL("https://embed.bsky.app/static/embed.js"),
	}

	var buf bytes.Buffer
	err = t.Execute(&buf, data)
	if err != nil {
		log.Error("template parse error", "err", err)
		return "", err
	}
	return buf.String(), nil
}
