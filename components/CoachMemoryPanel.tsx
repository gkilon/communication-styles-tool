import React, { useState } from 'react';
import type { CoachMemory, MemoryCategory, MemoryItem } from './useCoachMemory';
import { MAX_ITEMS, MAX_TEXT } from './useCoachMemory';

type Lang = 'he' | 'en';

const TEXT: Record<Lang, {
  title: string; sub: string; empty: string; add: string; addPlaceholder: string;
  edit: string; remove: string; save: string; cancel: string; clearAll: string; clearConfirm: string;
  removeConfirm: string; close: string; saveFailed: string; full: string;
  categories: Record<MemoryCategory, string>;
  sources: Record<MemoryItem['source'], string>;
}> = {
  he: {
    title: 'מה אני יודע עליך',
    sub: 'כך אני מבין אותך כרגע, ואני משתמש בזה בשיחות. קרא, תקן, מחק או הוסף. מודל הצבעים הוא רק כלי עזר אחד בתוך התמונה, ולא העיקר.',
    empty: 'עדיין אין כאן כלום. אפשר להוסיף משהו בעצמך, או שנדבר ואני אלמד.',
    add: 'הוסף',
    addPlaceholder: 'הוסף משהו שחשוב שאדע עליך...',
    edit: 'ערוך', remove: 'מחק', save: 'שמור', cancel: 'ביטול',
    clearAll: 'מחק הכל',
    clearConfirm: 'למחוק את כל מה שכתוב כאן? היועץ יפסיק להתבסס על זה.',
    removeConfirm: 'למחוק את השורה הזו?',
    close: 'סגור',
    saveFailed: 'השמירה נכשלה. השינויים יישארו רק כל עוד הדף פתוח.',
    full: 'הגעת למספר המרבי של שורות. מחק משהו כדי להוסיף.',
    categories: { work: 'מי אתה בעבודה', values: 'מה חשוב לך', patterns: 'דפוסים שזיהיתי', focus: 'על מה אנחנו עובדים' },
    sources: { questionnaire: 'מהשאלון', user: 'כתבת או ערכת', advisor: 'למדתי בשיחה' }
  },
  en: {
    title: 'What I know about you',
    sub: 'This is how I understand you right now, and I use it in our conversations. Read it, correct it, delete or add. The color model is just one helper inside the picture, not the center.',
    empty: 'Nothing here yet. You can add something yourself, or we talk and I learn.',
    add: 'Add',
    addPlaceholder: 'Add something that is important for me to know about you...',
    edit: 'Edit', remove: 'Delete', save: 'Save', cancel: 'Cancel',
    clearAll: 'Delete all',
    clearConfirm: 'Delete everything written here? The advisor will stop relying on it.',
    removeConfirm: 'Delete this line?',
    close: 'Close',
    saveFailed: 'Saving failed. Your changes will only stay while this page is open.',
    full: 'You have reached the maximum number of lines. Delete one to add more.',
    categories: { work: 'Who you are at work', values: 'What matters to you', patterns: 'Patterns I noticed', focus: 'What we are working on' },
    sources: { questionnaire: 'From the questionnaire', user: 'Written or edited by you', advisor: 'Learned in conversation' }
  }
};

const ORDER: MemoryCategory[] = ['work', 'values', 'patterns', 'focus'];

interface Props {
  memory: CoachMemory;
  lang: Lang;
  dir: 'rtl' | 'ltr';
  onClose: () => void;
}

export const CoachMemoryPanel: React.FC<Props> = ({ memory, lang, dir, onClose }) => {
  const tx = TEXT[lang === 'en' ? 'en' : 'he'];
  const align = dir === 'rtl' ? 'text-right' : 'text-left';
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newText, setNewText] = useState('');
  const [newCategory, setNewCategory] = useState<MemoryCategory>('patterns');
  const full = memory.items.length >= MAX_ITEMS;

  const startEdit = (i: MemoryItem) => { setEditingId(i.id); setEditText(i.text); };
  const saveEdit = () => {
    if (editingId && editText.trim()) memory.updateItem(editingId, editText);
    setEditingId(null);
  };
  const submitNew = () => {
    if (!newText.trim() || full) return;
    memory.addItem(newText, newCategory);
    setNewText('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
      dir={dir}
    >
      <div
        className={`w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-gray-900 border border-gray-700 rounded-2xl p-5 sm:p-6 shadow-2xl ${align}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 mb-1">
          <h3 className="text-xl font-black text-white">🧠 {tx.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm font-bold shrink-0">✕ {tx.close}</button>
        </div>
        <p className="text-sm text-gray-400 mb-5 leading-relaxed">{tx.sub}</p>

        {memory.saveFailed && <p className="text-xs text-red-400 mb-3">⚠️ {tx.saveFailed}</p>}

        {memory.items.length === 0 && <p className="text-gray-400 text-sm mb-4">{tx.empty}</p>}

        <div className="space-y-5">
          {ORDER.map(cat => {
            const list = memory.items.filter(i => i.category === cat);
            if (list.length === 0) return null;
            return (
              <div key={cat}>
                <div className="text-xs font-bold text-cyan-400 mb-2">{tx.categories[cat]}</div>
                <div className="space-y-2">
                  {list.map(i => (
                    <div key={i.id} className="bg-gray-800/70 border border-gray-700 rounded-xl p-3">
                      {editingId === i.id ? (
                        <div>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value.slice(0, MAX_TEXT))}
                            rows={2}
                            className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-sm text-white focus:ring-2 focus:ring-cyan-500"
                          />
                          <div className="flex gap-2 mt-2">
                            <button onClick={saveEdit} className="text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg">{tx.save}</button>
                            <button onClick={() => setEditingId(null)} className="text-xs font-bold bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg">{tx.cancel}</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-100 leading-relaxed">{i.text}</p>
                            <span className="inline-block mt-1 text-[11px] text-gray-500">{tx.sources[i.source]}</span>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button onClick={() => startEdit(i)} className="text-xs text-gray-400 hover:text-cyan-300 px-2 py-1" title={tx.edit}>✏️</button>
                            <button
                              onClick={() => { if (window.confirm(tx.removeConfirm)) memory.removeItem(i.id); }}
                              className="text-xs text-gray-400 hover:text-red-400 px-2 py-1"
                              title={tx.remove}
                            >🗑️</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 border-t border-gray-800 pt-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
              className="bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200"
            >
              {ORDER.map(c => <option key={c} value={c}>{tx.categories[c]}</option>)}
            </select>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value.slice(0, MAX_TEXT))}
              onKeyDown={(e) => { if (e.key === 'Enter') submitNew(); }}
              placeholder={tx.addPlaceholder}
              className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500"
            />
            <button
              onClick={submitNew}
              disabled={!newText.trim() || full}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-sm px-4 py-2 rounded-xl"
            >
              {tx.add}
            </button>
          </div>
          {full && <p className="text-xs text-amber-400 mt-2">{tx.full}</p>}
          {memory.items.length > 0 && (
            <button
              onClick={() => { if (window.confirm(tx.clearConfirm)) memory.clearAll(); }}
              className="mt-4 text-xs text-gray-500 hover:text-red-400"
            >
              {tx.clearAll}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
