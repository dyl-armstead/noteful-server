const path = require('path')
const express = require('express')
const xss = require('xss')
const NotesService = require('./notes-service')

const notesRouter = express.Router()
const jsonParser = express.json()

const serializeNote = notes => ({
  id: notes.id,
  folder_id: notes.folder_id,
  title: xss(notes.title),
  content: xss(notes.content),
  date_modified: notes.date_modified,
})

notesRouter
  .route('/')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    NotesService.getAllNotes(knexInstance)
      .then(notes => {
        res.json(notes.map(serializeNote))
      })
      .catch(next)
  })

  .post(jsonParser, (req, res, next) => {
    const { notes_id, title, content, folder_id } = req.body
    const newNote = { title, content }

    for (const [key, value] of Object.entries(newNote))
      if (value == null)
        return res.status(400).json({
          error: { message: `Missing '${key}' in request body` }
        })
    newNote.folder_id = folder_id
    newNote.id = notes_id
    NotesService.insertNote(
      req.app.get('db'),
      newNote
    )
      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl, `/${note.id}`))
          .json(serializeNote(note))
      })
      .catch(next)
  })

notesRouter
    .route('/:notes_id')
    .all((req, res, next) => {
    NotesService.getById(
        req.app.get('db'),
        req.params.notes_id
    )
        .then(notes => {
        if (!notes) {
            return res.status(404).json({
            error: { message: `Note doesn't exist` }
            })
        }
        res.notes = notes
        next()
        })
        .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeNote(res.notes))
      })
    .delete((req, res, next) => {
    NotesService.deleteNote(
        req.app.get('db'),
        req.params.notes_id
    )
        .then(numRowsAffected => {
        res.status(204).end()
        })
        .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { title, content } = req.body
        const noteToUpdate = { title, content }
    
        const numberOfValues = Object.values(noteToUpdate).filter(Boolean).length
        if (numberOfValues === 0)
          return res.status(400).json({
            error: {
              message: `Request body must content either 'title' or 'content'`
            }
          })
    
        NotesService.updateNote(
          req.app.get('db'),
          req.params.notes_id,
          noteToUpdate
        )
          .then(numRowsAffected => {
            res.status(204).end()
          })
          .catch(next)
      })


module.exports = notesRouter