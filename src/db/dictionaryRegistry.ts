export interface RawWord {
  source_word: string;
  translation: string;
}

export interface DictionaryConfig {
  id: string;
  name: string;
  loader: () => RawWord[];
}

export const dictionaries: DictionaryConfig[] = [
  {
    id: 'list_beginner_en_uk',
    name: 'Англійська для початківців',
    loader: () => require('./seeds/words_en_uk_beginner.json'),
  },
  // Наступні словники додавати сюди, наприклад:
  // {
  //   id: 'list_intermediate_en_uk',
  //   name: 'Середній рівень (Intermediate)',
  //   loader: () => require('./seeds/words_en_uk_intermediate.json'),
  // }
];
