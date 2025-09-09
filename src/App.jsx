import React, { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { getUrl, uploadData } from 'aws-amplify/storage';

import './App.css';

const client = generateClient();

function App() {
  const [notes, setNotes] = useState([]);
  const [formData, setFormData] = useState({ name: '', description: '', image: null });

  useEffect(() => {
    (async () => {
      const config = await import('../amplify_outputs.json');
      Amplify.configure(config.default);
      fetchNotes();
    })();
  }, []);

  async function fetchNotes() {
    const { data } = await client.models.Note.list();
    const notesWithImages = await Promise.all(
      data.map(async (note) => {
        if (note.image) {
          const imageUrl = await getUrl({ key: note.image });
          return { ...note, imageUrl: imageUrl.url };
        }
        return note;
      })
    );
    setNotes(notesWithImages);
  }

  async function createNote() {
    if (!formData.name || !formData.description) return;

    let imageKey;
    if (formData.image) {
      imageKey = `${Date.now()}-${formData.image.name}`;
      await uploadData({
        key: imageKey,
        data: formData.image,
      }).result;
    }

    await client.models.Note.create({
      name: formData.name,
      description: formData.description,
      image: imageKey,
    });

    setFormData({ name: '', description: '', image: null });
    fetchNotes();
  }

  async function deleteNote(id) {
    await client.models.Note.delete({ id });
    fetchNotes();
  }

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <main className="app">
          <h1>Hello, {user.username}</h1>
          <button onClick={signOut}>Sign out</button>

          <h2>Create Note</h2>
          <input
            type="text"
            placeholder="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <input
            type="text"
            placeholder="Description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
          <input
            type="file"
            onChange={(e) => setFormData({ ...formData, image: e.target.files[0] })}
          />
          <button onClick={createNote}>Create Note</button>

          <h2>Notes</h2>
          <ul>
            {notes.map((note) => (
              <li key={note.id}>
                <h3>{note.name}</h3>
                <p>{note.description}</p>
                {note.imageUrl && (
                  <img src={note.imageUrl} alt={note.name} style={{ width: 200 }} />
                )}
                <button onClick={() => deleteNote(note.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </main>
      )}
    </Authenticator>
  );
}

export default App;
