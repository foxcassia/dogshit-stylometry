const fs = require('fs');
const nlpService = require('./src/nlpService');
const {calculateTokensJSON} = require('./src/utils');
const text = fs.readFileSync('./corpus/corpusBackup.txt', 'utf8').toLowerCase();


const stylometryJSON = {
    lexical_density: nlpService.getLexicalDensity(text),
    adjective_adverb_density: nlpService.getAdjectiveAdverbDensity(text),
    lexical_diversity_as_MATTR: nlpService.getLexicalDiversityAsMovingAverageTTR(text, 250),
    active_voice_ratio: nlpService.calculateActiveVoicePercentage(text),
    readability_scores: nlpService.generateReadabilityScores(text),
    sentiment_distribution: nlpService.analyzeSentiment(text),
    sentence_variability_distribution: nlpService.generateSentenceVariability(text),
    POS_tags_data: nlpService.getPosData(text),
    commonly_used_ngrams: nlpService.compileNgrams(text, 3, 10)
}

let flattenedNgrams = [];
Object.keys(stylometryJSON.commonly_used_ngrams).forEach((ngram)=>{
    flattenedNgrams = flattenedNgrams.concat(stylometryJSON.commonly_used_ngrams[ngram]);
})

const stylometryTxt = `
Lexical Density: ${stylometryJSON.lexical_density}
Lexical Diversity (as MATTR): ${stylometryJSON.lexical_diversity_as_MATTR}
Adjective-Adverb Density: ${stylometryJSON.adjective_adverb_density}
Active Voice Ratio: ${stylometryJSON.active_voice_ratio}
Average Readability Grade Level: ${stylometryJSON.readability_scores.avgGradeLevel}
Positive Sentiment %: ${stylometryJSON.sentiment_distribution.positive}
Neutral Sentiment %: ${stylometryJSON.sentiment_distribution.neutral}
Negative Sentiment %: ${stylometryJSON.sentiment_distribution.negative}
Sentence Variability Mean: ${stylometryJSON.sentence_variability_distribution.mean}
Sentence Variability Median: ${stylometryJSON.sentence_variability_distribution.median}
Sentence Variability Standard Deviation: ${stylometryJSON.sentence_variability_distribution.standardDeviation}
Noun-Verb Ratio: ${stylometryJSON.POS_tags_data.nounVerbRatio}
Adjective-Noun Ratio: ${stylometryJSON.POS_tags_data.adjectiveNounRatio}
Adverb-Verb Ratio: ${stylometryJSON.POS_tags_data.adverbVerbRatio}
Pronoun Usage: ${stylometryJSON.POS_tags_data.pronounUsage}
Commonly Used NGrams: ${flattenedNgrams.join(', ')}
` //TODO include broad analysis notes

fs.writeFileSync('./outputs/result.json', JSON.stringify(stylometryJSON,null,2))
fs.writeFileSync('./outputs/result.txt', stylometryTxt)
console.log(`JSON Tokens: ${calculateTokensJSON(stylometryJSON)}`);


// discourse markers / cohesive devices
// pos tag ngrams