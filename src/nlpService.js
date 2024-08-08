const nlp = require('compromise');
const vader = require('vader-sentiment');
const natural = require('natural');
const {defaultStopWords} = require('./constants');


/*
  Lexical density is a measure of the proportion of content words 
  (nouns, verbs, adjectives, and adverbs) to the total number of words in a text. 
  A higher lexical density indicates a text rich in content words, 
  which typically suggests more complex and information-dense writing.

  Children's Books: Around 40-50%
  General Fiction: Around 50-60%
  Academic Writing: Around 60-70%
*/
exports.getLexicalDensity = (text) => {
    const doc = nlp(text);
    const contentWords = doc.nouns().out('array').length +
                         doc.verbs().out('array').length +
                         doc.adjectives().out('array').length +
                         doc.adverbs().out('array').length;
    const totalWords = doc.wordCount();
    return (contentWords / totalWords).toFixed(2);
} 

/* An Attempt to measure verbosity and purple prose */
exports.getAdjectiveAdverbDensity= (text) => {
    const doc = nlp(text);
    const adjectivesAdverbs = doc.adjectives().out('array').length + doc.adverbs().out('array').length;
    const totalWords = doc.wordCount();
    return (adjectivesAdverbs / totalWords).toFixed(4);
}

/*
  Lexical Diversity is the measure of the range of different words used in a text relative to the total number of words. 
  Using MATTR since it's less sensitive to text length, but it's still really sensitive to length.

  Children's Books: 0.2 - 0.4
  General Fiction and Non-fiction: 0.4 - 0.6
  Academic and Technical Writing: 0.6 - 0.8
  Highly Specialized Texts: 0.8
*/
function getLexicalDiversity(text){
    const doc = nlp(text);
    const words = doc.terms().out('array');
    const uniqueWords = [...new Set(words)];
    
    const totalWords = words.length;
    const uniqueWordCount = uniqueWords.length;
    
    return uniqueWordCount / totalWords;
}

exports.getLexicalDiversityAsMovingAverageTTR = (text, windowSize = 50) => {
    const doc = nlp(text);
    const words = doc.terms().out('array');
    
    if (words.length < windowSize) {
      return getLexicalDiversity(text).toFixed(2);
    }
  
    let ttrs = [];
    for (let i = 0; i <= words.length - windowSize; i++) {
      const window = words.slice(i, i + windowSize);
      const uniqueWords = [...new Set(window)];
      ttrs.push(uniqueWords.length / window.length);
    }
  
    const movingAverageTTR = ttrs.reduce((a, b) => a + b, 0) / ttrs.length;
  
    return movingAverageTTR.toFixed(2);
}

/* Active vs Passive voice usage as percent. Most modern authors aim for 100% */
exports.calculateActiveVoicePercentage = (text) => {
  const doc = nlp(text);
  const sentences = doc.sentences();
  const totalSentences = sentences.length;
  let passiveCount = 0;

  sentences.forEach(sentence => {
    if (sentence.has('#Passive')) {
      passiveCount += 1;
    }
  });

  const activeCount = totalSentences - passiveCount;
  const activePercentage = activeCount / totalSentences;

  return activePercentage.toFixed(2);
}

function countSyllables(word) {
  word = word.toLowerCase();
  if (word.length <= 3) { return 1; }
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  const syllableMatches = word.match(/[aeiouy]{1,2}/g);
  return (syllableMatches || []).length;
}

function calculateReadability(text) {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');
  const words = doc.terms().out('array');
  const syllables = words.reduce((total, term) => total + countSyllables(term), 0);

  const totalSentences = sentences.length;
  const totalWords = words.length;
  const totalSyllables = syllables;

  if (totalSentences === 0 || totalWords === 0) {
      return {
          fleschReadingEase: "N/A",
          fleschKincaidGradeLevel: "N/A"
      };
  }

  const fleschReadingEase = 206.835 - (1.015 * (totalWords / totalSentences)) - (84.6 * (totalSyllables / totalWords));
  const fleschKincaidGradeLevel = (0.39 * (totalWords / totalSentences)) + (11.8 * (totalSyllables / totalWords)) - 15.59;

  return {
      fleschReadingEase: fleschReadingEase.toFixed(2),
      fleschKincaidGradeLevel: fleschKincaidGradeLevel.toFixed(0)
  };
}

function calculateReadabilityByChunks(text) {
  const doc = nlp(text);
  const sentences = doc.sentences().out('array');
  const chunkSize = 10;
  let highestGradeLevel = { fleschReadingEase: -Infinity, fleschKincaidGradeLevel: -Infinity };
  let highestReadability = { fleschReadingEase: -Infinity, fleschKincaidGradeLevel: Infinity };

  for (let i = 0; i < sentences.length; i += chunkSize) {
        const chunk = sentences.slice(i, i + chunkSize).join(' ');
        const readability = calculateReadability(chunk);
        if (readability.fleschKincaidGradeLevel !== "N/A" && parseFloat(readability.fleschKincaidGradeLevel) > parseFloat(highestGradeLevel.fleschKincaidGradeLevel)) {
              highestGradeLevel = readability.fleschKincaidGradeLevel;
        }
        if (readability.fleschReadingEase !== "N/A" && parseFloat(readability.fleschReadingEase) > parseFloat(highestReadability.fleschReadingEase)) {
              highestReadability = readability.fleschReadingEase;
        }
  }

  return {
        highestGradeLevel,
        highestReadability,
  };
}

/* Readability as FleschKincaid Grade-Level score, with average across text and highest among chunks */
exports.generateReadabilityScores = (text) => {
  const readabilityScores = calculateReadability(text);
  const { highestGradeLevel, highestReadability } = calculateReadabilityByChunks(text);

  return {
        avgReadabilityScore: readabilityScores.fleschReadingEase,
        avgGradeLevel: readabilityScores.fleschKincaidGradeLevel,
        highestGradeLevel,
        highestReadability
  }
}

function splitTextIntoSentences(text) {
  return text.match(/[^.!?]*[.!?]/g);
}

/* VADER sentiment analysis by sentence. Vaguely accurate. */
exports.analyzeSentiment = (text) => {
  const sentences = splitTextIntoSentences(text);
  const sentimentScores = { positive: 0, negative: 0, neutral: 0 };

  sentences.forEach(sentence => {
      const analysis = vader.SentimentIntensityAnalyzer.polarity_scores(sentence);

      if (analysis.compound >= 0.05) {
          sentimentScores.positive += 1;
      } else if (analysis.compound <= -0.05) {
          sentimentScores.negative += 1;
      } else {
          sentimentScores.neutral += 1;
      }
  });

  const totalSentences = sentences.length;
  const percentages = {
      positive: (sentimentScores.positive / totalSentences).toFixed(2),
      negative: (sentimentScores.negative / totalSentences).toFixed(2),
      neutral: (sentimentScores.neutral / totalSentences).toFixed(2)
  };

  return percentages;
}

/* Sentence length variability to hopefully capture the pace and cadences of sentence lengths */
exports.generateSentenceVariability = (text) => {
  // better than compromise-sentences https://github.com/spencermountain/compromise/issues/1026
  function splitIntoSentences(text) { 
    const sentenceEndRegex = /([^.!?]+[.!?]+(?=(\s|$|["”'‘’“])))/gi;
    return text.match(sentenceEndRegex) || [];
  }
  
  function wordCount(sentence) {
    return sentence.split(/\s+/).filter(word => word.length > 0).length;
  }
  // sentence lengths
  const sentences = splitIntoSentences(text);
  const sentenceLengths = sentences.map(sentence => wordCount(sentence));

  // Mean
  const mean = sentenceLengths.reduce((sum, length) => sum + length, 0) / sentenceLengths.length;

  // Standard Deviation
  const variance = sentenceLengths.reduce((sum, length) => sum + Math.pow(length - mean, 2), 0) / sentenceLengths.length;
  const standardDeviation = Math.sqrt(variance);

  // Range
  const range = Math.max(...sentenceLengths) - Math.min(...sentenceLengths);

  // Median
  const sortedLengths = sentenceLengths.slice().sort((a, b) => a - b);
  const middle = Math.floor(sortedLengths.length / 2);
  const median = sortedLengths.length % 2 === 0 ? (sortedLengths[middle - 1] + sortedLengths[middle]) / 2 : sortedLengths[middle];

  // Interquartile Range (IQR)
  const Q1 = sortedLengths[Math.floor(sortedLengths.length / 4)];
  const Q3 = sortedLengths[Math.floor(3 * sortedLengths.length / 4)];
  const IQR = Q3 - Q1;

  // Skewness
  const skewness = sentenceLengths.reduce((sum, length) => sum + Math.pow((length - mean) / standardDeviation, 3), 0) / sentenceLengths.length;

  // Kurtosis
  const kurtosis = sentenceLengths.reduce((sum, length) => sum + Math.pow((length - mean) / standardDeviation, 4), 0) / sentenceLengths.length - 3;

  // Entropy
  const lengthFrequencies = sentenceLengths.reduce((freq, length) => {
      freq[length] = (freq[length] || 0) + 1;
      return freq;
  }, {});

  const totalSentences = sentenceLengths.length;
  const entropy = Object.values(lengthFrequencies).reduce((sum, count) => {
      const p = count / totalSentences;
      return sum - p * Math.log2(p);
  }, 0);

  return {
      mean: mean.toFixed(0),
      standardDeviation: standardDeviation.toFixed(2),
      range: range.toFixed(0),
      median: median.toFixed(0),
      IQR: IQR.toFixed(0),
      skewness: skewness.toFixed(2),
      kurtosis: kurtosis.toFixed(2),
      entropy: entropy.toFixed(2)
  };
}

exports.getPosData = (text) => {
  const doc = nlp(text);
  const terms = doc.terms().out('array');
  const tagsArr = doc.out('tags');
  let posString = '';
  tagsArr.forEach(tags => {
    Object.keys(tags).forEach((key) => {
        posString += tags[key] + ',';
    })
  });  
  
  const totalWords = terms.length;
  const nounCount = posString.match(/Noun/g).length || 0;
  const verbCount = posString.match(/Verb/g).length || 0;
  const adjectiveCount = posString.match(/Adjective/g).length || 0;
  const adverbCount = posString.match(/Adverb/g).length|| 0;
  const pronounCount = posString.match(/Pronoun/g).length || 0;

  return {
    nounVerbRatio: (nounCount / (verbCount || 1)).toFixed(2),
    adjectiveNounRatio: (adjectiveCount / (nounCount || 1)).toFixed(2),
    adverbVerbRatio: (adverbCount / (verbCount || 1)).toFixed(2),
    pronounUsage: (pronounCount / totalWords).toFixed(2)
  };
}

exports.generateNgramsS = (text) => {
  const doc = nlp(text);
  const words = doc.terms().out('array');

  const ngrams = {}

  for (let i = 0; i < words.length - 1; i++) {
    const ngram = `${words[i]} ${words[i + 1]}`;
    ngrams[ngram] = (ngrams[ngram] || 0) + 1;
  }

  for (let i = 0; i < words.length - 1; i++) {
    const ngram = `${words[i]} ${words[i + 1]}`;
    ngrams[ngram] = (ngrams[ngram] || 0) + 1;
  }

  for (let i = 0; i < words.length - 2; i++) {
    const ngram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
    ngrams[ngram] = (ngrams[ngram] || 0) + 1;
  }

  for (let i = 0; i < words.length - 3; i++) {
    const ngram = `${words[i]} ${words[i + 1]} ${words[i + 2]} ${words[i + 3]}`;
    ngrams[ngram] = (ngrams[ngram] || 0) + 1;
  }

  for (let i = 0; i < words.length - 4; i++) {
    const ngram = `${words[i]} ${words[i + 1]} ${words[i + 2]} ${words[i + 3]} ${words[i + 4]}`;
    ngrams[ngram] = (ngrams[ngram] || 0) + 1;
  }

  Object.keys(ngrams).forEach((ngram)=>{
    if(ngrams[ngram]===1){
      delete ngrams[ngram]
    }
  });

  return ngrams;
}

function generateNGrams(words, n) {
  const ngrams = {};
  for (let i = 0; i <= words.length - n; i++) {
    const ngram = words.slice(i, i + n).join(' ');
    ngrams[ngram] = (ngrams[ngram] || 0) + 1;
  }
  return ngrams;
}

exports.compileNgrams = (text, minNgramSize = 2, maxNgramSize = 5, countQualifier = 3, returnCount = 10) => {
  const doc = nlp(text);
  const words = doc.terms().out('array');
  const ngramsBySize = {}

  for (let n = minNgramSize; n <= maxNgramSize; n++) { 
    console.log(`Generating ${n}gram`);
    const ngrams = generateNGrams(words, n);
    let discovered = {}
    Object.keys(ngrams).forEach(ngram => {
      if (ngrams[ngram] > countQualifier) {
        discovered[ngram] = ngrams[ngram];
      }
    });
    
    const sorted = Object.entries(discovered).sort((a, b) => b[1] - a[1]);
    ngramsBySize[`${n}gram`] = []
    const limit = returnCount > sorted.length ? sorted.length : returnCount
    for(let i = 0; i < limit; i++){
      ngramsBySize[`${n}gram`].push(sorted[i][0]);
    }
    if(ngramsBySize[`${n}gram`].length===0){
      delete ngramsBySize[`${n}gram`]
    }
  }
  return ngramsBySize;
}


