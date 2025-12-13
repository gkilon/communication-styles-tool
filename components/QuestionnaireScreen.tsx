
import React from 'react';
import { QUESTION_PAIRS } from '../constants/questionnaireData';
import { QuestionSlider } from './QuestionSlider';
import { ArrowLeftIcon, ArrowRightIcon } from './icons/Icons';

interface QuestionnaireScreenProps {
  answers: Record<string, number>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onSubmit: () => void;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: React.Dispatch<React.SetStateAction<number>>;
}

const ProgressBar: React.FC<{ current: number; total: number }> = ({ current, total }) => {
  const percentage = (current / total) * 100;
  return (
    <div className="w-full bg-gray-700 rounded-full h-4 my-6">
      <div
        className="bg-cyan-500 h-4 rounded-full transition-all duration-500 ease-out shadow-[0_0_10px_rgba(6,182,212,0.5)]"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};

export const QuestionnaireScreen: React.FC<QuestionnaireScreenProps> = ({ 
  answers, 
  setAnswers, 
  onSubmit,
  currentQuestionIndex,
  setCurrentQuestionIndex
}) => {

  const totalQuestions = QUESTION_PAIRS.length;
  const currentQuestion = QUESTION_PAIRS[currentQuestionIndex];

  const handleAnswerChange = (id: string, value: number) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < totalQuestions - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      onSubmit();
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  return (
    <div className="bg-gray-800 p-8 md:p-12 lg:p-16 rounded-2xl shadow-2xl max-w-5xl mx-auto border border-gray-700">
      <div className="text-center mb-8">
        <p className="text-lg text-gray-400 font-medium">שאלה {currentQuestionIndex + 1} מתוך {totalQuestions}</p>
        <ProgressBar current={currentQuestionIndex + 1} total={totalQuestions} />
      </div>

      <div key={currentQuestion.id} className="animate-fade-in-up my-12">
        <QuestionSlider
          question={currentQuestion}
          value={answers[currentQuestion.id] ?? 4}
          onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
        />
      </div>

      <div className="flex justify-between items-center mt-12">
        <button
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-3 px-6 rounded-full transition-all duration-300 disabled:opacity-30 disabled:cursor-not-allowed text-lg"
        >
          <ArrowRightIcon className="w-6 h-6" />
          <span>הקודם</span>
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-full transition-all duration-300 transform hover:scale-105 shadow-lg text-lg"
        >
          <span>{currentQuestionIndex === totalQuestions - 1 ? 'צפה בתוצאות' : 'הבא'}</span>
          <ArrowLeftIcon className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
};
