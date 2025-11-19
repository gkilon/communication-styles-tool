
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
    <div className="w-full bg-gray-700 rounded-full h-2.5 my-4">
      <div
        className="bg-cyan-500 h-2.5 rounded-full transition-all duration-500 ease-out"
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
    <div className="bg-gray-800 p-6 sm:p-8 rounded-lg shadow-2xl max-w-2xl mx-auto">
      <div className="text-center mb-4">
        <p className="text-sm text-gray-400">שאלה {currentQuestionIndex + 1} מתוך {totalQuestions}</p>
        <ProgressBar current={currentQuestionIndex + 1} total={totalQuestions} />
      </div>

      <div key={currentQuestion.id} className="animate-fade-in-up my-8">
        <QuestionSlider
          question={currentQuestion}
          value={answers[currentQuestion.id] ?? 4}
          onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
        />
      </div>

      <div className="flex justify-between items-center mt-8">
        <button
          onClick={handlePrev}
          disabled={currentQuestionIndex === 0}
          className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <ArrowRightIcon className="w-5 h-5" />
          <span>הקודם</span>
        </button>
        <button
          onClick={handleNext}
          className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-full transition-all duration-300 transform hover:scale-105"
        >
          <span>{currentQuestionIndex === totalQuestions - 1 ? 'צפה בתוצאות' : 'הבא'}</span>
          <ArrowLeftIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};
