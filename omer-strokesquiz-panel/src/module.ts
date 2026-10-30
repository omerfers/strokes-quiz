import { PanelPlugin } from '@grafana/data';
import { StrokesQuizPanel } from './components/StrokesQuizPanel';
import { DEFAULT_OPTIONS, QuizOptions } from './types';
export const plugin = new PanelPlugin<QuizOptions>(StrokesQuizPanel).setPanelOptions((builder) => {
  return builder
    .addNumberInput({
      path: 'rounds',
      name: 'Songs per game',
      description: 'How many songs a single run contains. The queue reshuffles if it runs out.',
      category: ['Quiz'],
      defaultValue: DEFAULT_OPTIONS.rounds,
      settings: { min: 1, max: 50, integer: true },
    })
    .addNumberInput({
      path: 'clipLengthSeconds',
      name: 'Clip length (seconds)',
      description: 'How long the player gets to listen before guessing.',
      category: ['Quiz'],
      defaultValue: DEFAULT_OPTIONS.clipLengthSeconds,
      settings: { min: 1, max: 60 },
    })
    .addNumberInput({
      path: 'revealSeconds',
      name: 'Reveal length (seconds)',
      description: 'How long the song plays after the answer is shown.',
      category: ['Quiz'],
      defaultValue: DEFAULT_OPTIONS.revealSeconds,
      settings: { min: 1, max: 60 },
    })
    .addNumberInput({
      path: 'maxGuesses',
      name: 'Guesses before the round is lost',
      description: 'After this many misses the answer is shown and the quiz moves on.',
      category: ['Quiz'],
      defaultValue: DEFAULT_OPTIONS.maxGuesses,
      settings: { min: 1, max: 10, integer: true },
    })
    .addNumberInput({
      path: 'extraIntroSkipSeconds',
      name: 'Extra intro skip (seconds)',
      description:
        'Added on top of each song start offset. Room on Fire tracks already skip ~1.2s of lead-in; nudge this if a clip still starts silent.',
      category: ['Audio'],
      defaultValue: DEFAULT_OPTIONS.extraIntroSkipSeconds,
      settings: { min: 0, max: 10, step: 0.1 },
    })
    .addBooleanSwitch({
      path: 'showAlbumArt',
      name: 'Show album art',
      description: 'Real album cover during the reveal.',
      category: ['Appearance'],
      defaultValue: DEFAULT_OPTIONS.showAlbumArt,
    })
    .addBooleanSwitch({
      path: 'showHints',
      name: 'Show hints',
      description: 'After a wrong guess, reveal the album/year, then the title pattern.',
      category: ['Appearance'],
      defaultValue: DEFAULT_OPTIONS.showHints,
    })
    .addBooleanSwitch({
      path: 'showBackground',
      name: 'Wallpaper background',
      description: 'Use the bundled Strokes wallpaper behind the game.',
      category: ['Appearance'],
      defaultValue: DEFAULT_OPTIONS.showBackground,
    })
    .addSliderInput({
      path: 'backgroundDim',
      name: 'Wallpaper dimming',
      description: 'Darkens the wallpaper so the text stays readable. 0 = original image, 100 = black.',
      category: ['Appearance'],
      defaultValue: DEFAULT_OPTIONS.backgroundDim,
      settings: { min: 0, max: 95, step: 5 },
    })
    .addTextInput({
      path: 'credit',
      name: 'Credit line',
      description: 'Shown in the panel footer.',
      category: ['About'],
      defaultValue: DEFAULT_OPTIONS.credit,
    });
});
