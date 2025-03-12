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
            },
            help: {
                title: 'Help Guide - Transcribo',
                mediaControls: {
                    title: 'Basic Media Controls',
                    spacebar: 'Press {key} to play/pause the video or audio',
                    spectrogramClick: 'Click or drag on the spectrogram to seek to a specific position',
                    arrowKeys: 'Use {leftKey} or {rightKey} to seek 5 seconds back or forward',
                    shiftArrows: 'Hold {shiftKey} + {leftKey}/{rightKey} to seek 30 seconds',
                    ctrlArrows: 'Hold {ctrlKey} + {leftKey}/{rightKey} to seek 1 second',
                    mouseWheel: 'Use mouse wheel to zoom into the timeline, or use the range slider below',
                    ctrlClick: 'Use {ctrlKey} + left click to move around the timeline'
                },
                segments: {
                    title: 'Transcription Segments',
                    intro: 'At the bottom, the current transcription segment is shown for editing:',
                    speaker: 'In the dropdown, assign a speaker (type in the search box to create a new speaker)',
                    timeChange: 'Change the time in seconds in the timespan text fields',
                    seekTime: 'Click on the timestamps to seek to that time',
                    insertBefore: 'Press the button with the arrow up to insert a segment before',
                    insertAfter: 'Press the button with the arrow down to insert a segment below',
                    deleteSegment: 'Press the delete button to remove the segment'
                },
                timeline: {
                    title: 'Working with Segments on Timeline',
                    hoverText: 'Hover over a rectangle to see the text',
                    clickSelect: 'Click on a rectangle to select it and see the handles',
                    moveWithKeys: 'When selected, you can move the rectangle 0.5 seconds to the left or right with the arrow keys',
                    dragMove: 'Drag the rectangle to move it',
                    resizeHandles: 'Drag the handles on the left or right side to resize the rectangle',
                    altSnap: 'Hold the {altKey} key while moving to prevent snapping to other rectangles'
                },
                editing: {
                    title: 'Editing Operations',
                    undo: 'Use {ctrlKey} + {zKey} for undo',
                    redo: 'Use {ctrlKey} + {yKey} for redo',
                    buttons: 'Or press the undo/redo buttons at the top left'
                }
            }
        },

        de: {
            upload: {
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
            },
            help: {
                title: 'Hilfe - Transcribo',
                mediaControls: {
                    title: 'Grundlegende Mediensteuerung',
                    spacebar: 'Drücken Sie {key} zum Abspielen/Pausieren von Video oder Audio',
                    spectrogramClick: 'Klicken oder ziehen Sie auf das Spektrogramm, um zu einer bestimmten Position zu springen',
                    arrowKeys: 'Verwenden Sie {leftKey} oder {rightKey} um 5 Sekunden zurück oder vorwärts zu springen',
                    shiftArrows: 'Halten Sie {shiftKey} + {leftKey}/{rightKey} um 30 Sekunden zu springen',
                    ctrlArrows: 'Halten Sie {ctrlKey} + {leftKey}/{rightKey} um 1 Sekunde zu springen',
                    mouseWheel: 'Verwenden Sie das Mausrad zum Zoomen in die Zeitleiste oder nutzen Sie den Bereichsregler unten',
                    ctrlClick: 'Verwenden Sie {ctrlKey} + Linksklick, um sich auf der Zeitleiste zu bewegen'
                },
                segments: {
                    title: 'Transkriptionssegmente',
                    intro: 'Am unteren Rand wird das aktuelle Transkriptionssegment zur Bearbeitung angezeigt:',
                    speaker: 'Im Dropdown-Menü können Sie einen Sprecher zuweisen (tippen Sie in das Suchfeld, um einen neuen Sprecher zu erstellen)',
                    timeChange: 'Ändern Sie die Zeit in Sekunden in den Zeitspannen-Textfeldern',
                    seekTime: 'Klicken Sie auf die Zeitstempel, um zu dieser Zeit zu springen',
                    insertBefore: 'Drücken Sie den Knopf mit dem Pfeil nach oben, um ein Segment davor einzufügen',
                    insertAfter: 'Drücken Sie den Knopf mit dem Pfeil nach unten, um ein Segment danach einzufügen',
                    deleteSegment: 'Drücken Sie den Löschen-Knopf, um das Segment zu entfernen'
                },
                timeline: {
                    title: 'Arbeiten mit Segmenten auf der Zeitleiste',
                    hoverText: 'Fahren Sie mit dem Mauszeiger über ein Rechteck, um den Text zu sehen',
                    clickSelect: 'Klicken Sie auf ein Rechteck, um es auszuwählen und die Griffe zu sehen',
                    moveWithKeys: 'Wenn ausgewählt, können Sie das Rechteck mit den Pfeiltasten um 0,5 Sekunden nach links oder rechts verschieben',
                    dragMove: 'Ziehen Sie das Rechteck, um es zu verschieben',
                    resizeHandles: 'Ziehen Sie die Griffe auf der linken oder rechten Seite, um das Rechteck in der Größe zu ändern',
                    altSnap: 'Halten Sie die {altKey}-Taste gedrückt, während Sie es verschieben, um das Einrasten an anderen Rechtecken zu verhindern'
                },
                editing: {
                    title: 'Bearbeitungsvorgänge',
                    undo: 'Verwenden Sie {ctrlKey} + {zKey} zum Rückgängigmachen',
                    redo: 'Verwenden Sie {ctrlKey} + {yKey} zum Wiederholen',
                    buttons: 'Oder drücken Sie die Schaltflächen für Rückgängig/Wiederholen oben links'
                }
            }
        },
    },
}));
