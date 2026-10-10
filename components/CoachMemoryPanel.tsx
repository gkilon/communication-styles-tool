import React, { useState } from 'react';
import type { CoachMemory } from './useCoachMemory';
import { MAX_TEXT } from './useCoachMemory';

type Lang = 'he' | 'en';

const TEXT: Record<Lang, {
  title: string; sub: string; writing: string; empty: string; edit: string; save: string; cancel: string;
  refresh: string; refreshConfirm: string; remove: string; removeConfirm: string; close: string;
  saveFailed: string; addLabel: string; addPlaceholder: string; add: string;
  refreshBanner: string; refreshYes: string; refreshNo: string; edited: string; draft: string;
  learned: string; updatedTitle: string; undo: string; gotIt: string; learningNow: string;
}> = {
  he: {
    title: 'מה אני יודע עליך',
    sub: 'כך אני מבין אותך כרגע, ואני משתמש בזה בשיחות. זו השערה ראשונית מהשאלון, ולא עובדה. קרא, תקן, הוסף או מחק. מודל הצבעים הוא רק כלי עזר אחד בתוך התמונה, ולא העיקר.',
    writing: 'כותב עכשיו את מה שהבנתי עליך...',
    empty: 'אין כאן כלום כרגע. אפשר לכתוב בעצמך, או שאכתוב מחדש מהשאלון.',
    edit: 'ערוך',
    save: 'שמור',
    cancel: 'ביטול',
    refresh: 'כתוב מחדש מהשאלון',
    refreshConfirm: 'לכתוב מחדש לפי השאלון? מה שכתבת או ערכת ישולב בטקסט החדש.',
    remove: 'מחק',
    removeConfirm: 'למחוק את כל הטקסט? היועץ יפסיק להתבסס עליו.',
    close: 'סגור',
    saveFailed: 'השמירה נכשלה. השינויים יישארו רק כל עוד הדף פתוח.',
    addLabel: 'יש משהו שחשוב שאדע?',
    addPlaceholder: 'כתוב משפט או שניים, ואוסיף לתמונה...',
    add: 'הוסף',
    refreshBanner: 'נראה שמילאת את השאלון מחדש. לעדכן את הטקסט לפי התוצאות החדשות? מה שכתבת בעצמך ישולב.',
    refreshYes: 'עדכן',
    refreshNo: 'השאר כמו שהוא',
    edited: 'ערכת את הטקסט הזה',
    draft: 'טיוטה ראשונה שלי מהשאלון',
    learned: 'עודכן אחרי שיחות',
    updatedTitle: 'עדכנתי אחרי השיחה האחרונה',
    undo: 'בטל את העדכון',
    gotIt: 'הבנתי',
    learningNow: 'מעדכן לפי השיחה...'
  },
  en: {
    title: 'What I know about you',
    sub: 'This is how I understand you right now, and I use it in our conversations. It is a first hypothesis from the questionnaire, not a fact. Read it, correct it, add to it or delete it. The color model is just one helper inside the picture, not the center.',
    writing: 'Writing what I understood about you...',
    empty: 'Nothing here right now. You can write it yourself, or I can write it again from the questionnaire.',
    edit: 'Edit',
    save: 'Save',
    cancel: 'Cancel',
    refresh: 'Rewrite from the questionnaire',
    refreshConfirm: 'Rewrite from the questionnaire? What you wrote or edited will be woven into the new text.',
    remove: 'Delete',
    removeConfirm: 'Delete all the text? The advisor will stop relying on it.',
    close: 'Close',
    saveFailed: 'Saving failed. Your changes will only stay while this page is open.',
    addLabel: 'Is there something I should know?',
    addPlaceholder: 'Write a sentence or two and I will add it to the picture...',
    add: 'Add',
    refreshBanner: 'It looks like you retook the questionnaire. Update the text to match the new results? What you wrote yourself will be woven in.',
    refreshYes: 'Update',
    refreshNo: 'Keep it as it is',
    edited: 'You edited this text',
    draft: 'My first draft from the questionnaire',
    learned: 'Updated after conversations',
    updatedTitle: 'What I updated after the last conversation',
    undo: 'Undo the update',
    gotIt: 'Got it',
    learningNow: 'Updating from the conversation...'
  }
};

interface Props {
  memory: CoachMemory;
  lang: Lang;
  dir: 'rtl' | 'ltr';
  onClose: () => void;
}

export const CoachMemoryPanel: React.FC<Props> = ({ memory, lang, dir, onClose }) => {
  const tx = TEXT[lang === 'en' ? 'en' : 'he'];
  const align = dir === 'rtl' ? 'text-right' : 'text-left';
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [addText, setAddText] = useState('');

  const startEdit = () => { setDraft(memory.text); setEditing(true); };
  const saveEdit = () => { memory.saveText(draft); setEditing(false); };
  const submitAdd = () => {
    if (!addText.trim()) return;
    memory.appendSentence(addText);
    setAddText('');
  };
  const paragraphs = memory.text.split(/\n{2,}|\n/).map(p => p.trim()).filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose} dir={dir}>
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

        {memory.learning && <p className="text-xs text-cyan-300 animate-pulse mb-3">⏳ {tx.learningNow}</p>}

        {memory.lastChange && (
          <div className="mb-4 bg-cyan-900/20 border border-cyan-700/50 rounded-xl p-3">
            <div className="text-sm font-bold text-cyan-200 mb-1">✨ {tx.updatedTitle}</div>
            <ul className="text-sm text-gray-200 space-y-1 list-disc ps-5">
              {memory.lastChange.summary.map((line, i) => <li key={i}>{line}</li>)}
            </ul>
            <div className="flex gap-2 mt-3">
              {memory.canUndo && (
                <button onClick={memory.undoLastChange} className="text-xs font-bold bg-gray-700 hover:bg-gray-600 text-gray-100 px-3 py-1.5 rounded-lg">{tx.undo}</button>
              )}
              <button onClick={memory.dismissChange} className="text-xs font-bold bg-cyan-700 hover:bg-cyan-600 text-white px-3 py-1.5 rounded-lg">{tx.gotIt}</button>
            </div>
          </div>
        )}

        {memory.refreshSuggested && (
          <div className="mb-4 bg-amber-900/20 border border-amber-600/40 rounded-xl p-3">
            <p className="text-sm text-amber-200 mb-2">{tx.refreshBanner}</p>
            <div className="flex gap-2">
              <button
                onClick={() => memory.regenerate()}
                disabled={memory.generating}
                className="text-xs font-bold bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white px-3 py-1.5 rounded-lg"
              >
                {tx.refreshYes}
              </button>
              <button onClick={memory.dismissRefresh} className="text-xs font-bold bg-gray-700 hover:bg-gray-600 text-gray-200 px-3 py-1.5 rounded-lg">
                {tx.refreshNo}
              </button>
            </div>
          </div>
        )}

        {memory.generating ? (
          <p className="text-sm text-cyan-300 animate-pulse py-6">⏳ {tx.writing}</p>
        ) : editing ? (
          <div>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_TEXT))}
              rows={12}
              className="w-full bg-gray-800 border border-gray-600 rounded-xl p-3 text-sm text-white leading-relaxed focus:ring-2 focus:ring-cyan-500"
            />
            <div className="flex items-center gap-2 mt-2">
              <button onClick={saveEdit} className="text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-xl">{tx.save}</button>
              <button onClick={() => setEditing(false)} className="text-sm font-bold bg-gray-700 hover:bg-gray-600 text-gray-200 px-4 py-2 rounded-xl">{tx.cancel}</button>
              <span className="text-xs text-gray-500 ms-auto">{draft.length}/{MAX_TEXT}</span>
            </div>
          </div>
        ) : paragraphs.length === 0 ? (
          <div className="py-4">
            <p className="text-sm text-gray-400 mb-3">{tx.empty}</p>
            <div className="flex gap-2">
              <button onClick={startEdit} className="text-sm font-bold bg-gray-700 hover:bg-gray-600 text-gray-100 px-4 py-2 rounded-xl">✏️ {tx.edit}</button>
              <button onClick={() => memory.regenerate()} className="text-sm font-bold bg-cyan-700 hover:bg-cyan-600 text-white px-4 py-2 rounded-xl">🔄 {tx.refresh}</button>
            </div>
          </div>
        ) : (
          <div>
            <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-4 space-y-3">
              {paragraphs.map((p, i) => (
                <p key={i} className="text-[15px] text-gray-100 leading-relaxed">{p}</p>
              ))}
            </div>
            <div className="mt-2 text-[11px] text-gray-500">{memory.source === 'user' ? tx.edited : memory.source === 'learned' ? tx.learned : tx.draft}</div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={startEdit} className="text-sm font-bold bg-gray-700 hover:bg-gray-600 text-gray-100 px-3 py-2 rounded-xl">✏️ {tx.edit}</button>
              <button
                onClick={() => { if (memory.source !== 'user' || window.confirm(tx.refreshConfirm)) memory.regenerate(); }}
                className="text-sm font-bold bg-gray-700 hover:bg-gray-600 text-gray-100 px-3 py-2 rounded-xl"
              >
                🔄 {tx.refresh}
              </button>
              <button
                onClick={() => { if (window.confirm(tx.removeConfirm)) memory.clear(); }}
                className="text-sm font-bold bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-red-400 px-3 py-2 rounded-xl"
              >
                🗑️ {tx.remove}
              </button>
            </div>
          </div>
        )}

        {!editing && !memory.generating && paragraphs.length > 0 && (
          <div className="mt-6 border-t border-gray-800 pt-4">
            <div className="text-sm font-bold text-gray-300 mb-2">{tx.addLabel}</div>
            <div className="flex gap-2">
              <input
                type="text"
                value={addText}
                onChange={(e) => setAddText(e.target.value.slice(0, 400))}
                onKeyDown={(e) => { if (e.key === 'Enter') submitAdd(); }}
                placeholder={tx.addPlaceholder}
                className="flex-1 min-w-0 bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white focus:ring-2 focus:ring-cyan-500"
              />
              <button
                onClick={submitAdd}
                disabled={!addText.trim()}
                className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold text-sm px-4 py-2 rounded-xl"
              >
                {tx.add}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
