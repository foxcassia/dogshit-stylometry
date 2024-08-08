const fs = require('fs');
const nlpService = require('./src/nlpService');
const {calculateTokensJSON, jsonToBulletedList} = require('./src/utils');
const text = fs.readFileSync('corpusBackup.txt', 'utf8').toLowerCase();


const stylometry = {
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
fs.writeFileSync('./outputs/result.json', JSON.stringify(stylometry,null,2))
console.log(`JSON Tokens: ${calculateTokensJSON(stylometry)}`);


// discourse markers / cohesive devices
// pos tag ngrams