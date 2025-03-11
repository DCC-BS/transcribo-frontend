export default defineI18nConfig(() => ({
    legacy: false,
    availableLocales: ['en', 'de'],
    locale: 'de',
    messages: {
        en: {
            upload: {
                convertingMedia: 'Converting media to WAV format...',
                uploadingMedia: 'Uploading the media file...',
                processingError: 'Failed to process the media file. Please try again.'
            },
            pages: {
                index: {
                    uploadMedia: 'Upload Media'
                }
            },
            navigation: {
                new: 'New',
                transcriptions: 'Transcriptions',
                languages: 'Languages',
                undo: 'Undo',
                redo: 'Redo',
                actions: 'Actions'
            },
            timeline: {
                noTranscription: 'No transcription available'
            },
            media: {
                play: 'Play',
                pause: 'Pause'
            },
            taskStatus: {
                processing: 'Processing your request...',
                completed: 'Transcription completed successfully!'
            },
            transcription: {
                noSpeaker: 'unknown',
                applySpeakerChanges: 'Do you want to apply your changes?',
                undoChanges: 'Undo',
                applyChanges: 'Apply',
                placeholderSpeakerName: 'Speaker name',
                loading: 'Loading...',
                notFound: 'Transcription not found or failed to load',
                noTranscriptionsFound: 'No transcriptions found',
                untitled: 'Untitled',
                delete: {
                    title: 'Delete Transcription',
                    confirmation: 'Are you sure you want to delete this transcription?'
                },
                actions: {
                    edit: 'Edit',
                    delete: 'Delete'
                },
                table: {
                    name: 'Name',
                    createdAt: 'Created at',
                    updatedAt: 'Updated at'
                }
            },
            ui: {
                saveChangesHint: 'Leave text field or press Enter to save changes',
                emptyState: {
                    title: 'No data found',
                    description: 'There is no data available to display.'
                }
            },
            export: {
                withSpeakers: 'With speakers',
                exportAsText: 'Export as text',
                exportAsSrt: 'Export as SRT'
            },
            task: {
                errors: {
                    noMediaFile: 'No media file found for task',
                    failedToLoad: 'Failed to get task'
                }
            },
            commands: {
                empty: 'Empty Command',
                startTranscription: 'Start Transcription: Task ID {taskId}, File: {fileName}',
                transcriptionFinished: 'Transcription Finished: Status {status}{hasResults}',
                transcriptionFinishedResults: ', Results available',
                seekToSeconds: 'Seek To: {seconds} seconds',
                togglePlay: 'Toggle Play/Pause',
                insertSegment: 'Insert Segment {direction}',
                deleteSegment: 'Delete Segment',
                updateSegment: 'Update Segment: Updates: {updates}',
                updateSegmentNoUpdates: 'Update Segment: Updates: none',
                changeTranscriptionName: 'Change Transcription Name To: {name}',
                renameSpeaker: 'Rename Speaker: "{oldName}" → "{newName}"'
            }
        },

        de: {
            upload: {
                convertingMedia: 'Konvertiere Medien in das WAV-Format...',
                uploadingMedia: 'Lade die Mediendatei hoch...',
                processingError: 'Fehler bei der Verarbeitung der Mediendatei. Bitte versuchen Sie es erneut.'
            },
            pages: {
                index: {
                    uploadMedia: 'Medien hochladen'
                }
            },
            navigation: {
                new: 'Neu',
                transcriptions: 'Transkriptionen',
                languages: 'Sprachen',
                undo: 'Rückgängig',
                redo: 'Wiederholen',
                actions: 'Aktionen'
            },
            timeline: {
                noTranscription: 'Keine Transkription verfügbar'
            },
            media: {
                play: 'Abspielen',
                pause: 'Pause'
            },
            taskStatus: {
                processing: 'Verarbeite deine Anfrage...',
                completed: 'Transkription erfolgreich abgeschlossen!'
            },
            transcription: {
                noSpeaker: 'unbekannt',
                applySpeakerChanges: 'Möchtest du deine Änderungen übernehmen?',
                undoChanges: 'Rückgängig',
                applyChanges: 'Übernehmen',
                placeholderSpeakerName: 'Sprechername',
                loading: 'Lädt...',
                notFound: 'Transkription nicht gefunden oder konnte nicht geladen werden',
                noTranscriptionsFound: 'Keine Transkriptionen gefunden',
                untitled: 'Ohne Titel',
                delete: {
                    title: 'Transkription löschen',
                    confirmation: 'Sind Sie sicher, dass Sie diese Transkription löschen möchten?'
                },
                actions: {
                    edit: 'Bearbeiten',
                    delete: 'Löschen'
                },
                table: {
                    name: 'Name',
                    createdAt: 'Erstellt am',
                    updatedAt: 'Aktualisiert am'
                }
            },
            ui: {
                saveChangesHint: 'Textfeld verlassen oder Enter drücken, um Änderungen zu übernehmen',
                emptyState: {
                    title: 'Keine Daten gefunden',
                    description: 'Es sind keine Daten zum Anzeigen verfügbar.'
                }
            },
            export: {
                withSpeakers: 'Mit Sprechern',
                exportAsText: 'Als Text exportieren',
                exportAsSrt: 'Als SRT exportieren'
            },
            task: {
                errors: {
                    noMediaFile: 'Keine Mediendatei für diese Aufgabe gefunden',
                    failedToLoad: 'Fehler beim Laden der Aufgabe'
                }
            },
            commands: {
                empty: 'Leerer Befehl',
                startTranscription: 'Starte Transkription: Aufgaben-ID {taskId}, Datei: {fileName}',
                transcriptionFinished: 'Transkription abgeschlossen: Status {status}{hasResults}',
                transcriptionFinishedResults: ', Ergebnisse verfügbar',
                seekToSeconds: 'Springe zu: {seconds} Sekunden',
                togglePlay: 'Wiedergabe/Pause umschalten',
                insertSegment: 'Segment {direction} einfügen',
                deleteSegment: 'Segment löschen',
                updateSegment: 'Segment aktualisieren: Änderungen: {updates}',
                updateSegmentNoUpdates: 'Segment aktualisieren: Keine Änderungen',
                changeTranscriptionName: 'Transkriptionsname ändern zu: {name}',
                renameSpeaker: 'Sprecher umbenennen: "{oldName}" → "{newName}"'
            }
        },
    },
}));
