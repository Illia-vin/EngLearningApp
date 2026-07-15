export const migration001 = `
    CREATE TABLE IF NOT EXISTS word_lists(
    id TEXT PRIMARY KEY
    name TEXT NOT NULL
    
    )
`