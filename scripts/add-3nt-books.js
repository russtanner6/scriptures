#!/usr/bin/env node
/**
 * Add Revelation (22ch), Romans (16ch), Titus (3ch) — all Gemini outputs
 * Reads each JSON file, appends new entries, writes back.
 */
const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, '..', 'data');

function readJSON(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA, file), 'utf8'));
}
function writeJSON(file, data) {
  fs.writeFileSync(path.join(DATA, file), JSON.stringify(data, null, 2) + '\n');
  console.log(`  Wrote ${file} (${data.length} total entries)`);
}

// Helper: sentiment scores from dominant category
function sentimentScores(dominant) {
  const map = {
    'Peace':       { exaltation: 4, peace: 8, admonition: 2, contrition: 2 },
    'Admonition':  { exaltation: 2, peace: 2, admonition: 8, contrition: 4 },
    'Exaltation':  { exaltation: 8, peace: 4, admonition: 2, contrition: 2 },
    'Contrition':  { exaltation: 2, peace: 2, admonition: 4, contrition: 8 },
  };
  return map[dominant] || { exaltation: 5, peace: 5, admonition: 5, contrition: 5 };
}

// Speaker ID -> display name mapping
const speakerNames = {
  'john-apostle': 'John',
  'jesus-christ': 'Jesus Christ',
  'god-the-father': 'God the Father',
  'paul': 'Paul',
  'tertius': 'Tertius',
};

// ============================================================
// REVELATION DATA (22 chapters)
// ============================================================
const REV = { book: 'Revelation', vol: 'NT', volName: 'New Testament', bookId: 66, chapters: 22 };

const revSentiments = [
  { ch:1, dom:'Peace', rat:"The opening vision of the glorified Christ provides comfort and assurance to the suffering saints." },
  { ch:2, dom:'Admonition', rat:"The messages to the four churches contain specific corrections and warnings regarding apostasy and compromise." },
  { ch:3, dom:'Admonition', rat:"The final three messages deliver sharp rebukes, particularly for the lukewarmness of the Laodiceans." },
  { ch:4, dom:'Peace', rat:"The vision of God's throne room emphasizes His ultimate sovereignty and the beauty of celestial worship." },
  { ch:5, dom:'Peace', rat:"The appearance of the Lamb who is worthy to open the seals brings hope and rejoicing to the entire host of heaven." },
  { ch:6, dom:'Admonition', rat:"The opening of the seals depicts the judgments, wars, and calamities that will visit the earth throughout its history." },
  { ch:7, dom:'Peace', rat:"The sealing of the faithful and the vision of the multitude in white provide deep comfort regarding the protection of the righteous." },
  { ch:8, dom:'Admonition', rat:"The sounding of the first four trumpets signals intense physical destruction and judgment upon the earth." },
  { ch:9, dom:'Admonition', rat:"The release of the locusts and the army of horsemen represents severe spiritual and physical woes." },
  { ch:10, dom:'Peace', rat:"John's interaction with the mighty angel and the sweet little book represents the restorative power of the gospel mission." },
  { ch:11, dom:'Admonition', rat:"The account of the two witnesses and the final trumpet emphasizes the conflict between the world and God's servants." },
  { ch:12, dom:'Admonition', rat:"The vision of the dragon's war against the woman and her child highlights the cosmic struggle between good and evil." },
  { ch:13, dom:'Admonition', rat:"The rise of the beasts and the imposition of the mark depict the peak of worldly tyranny and spiritual deception." },
  { ch:14, dom:'Peace', rat:"The vision of the 144,000 with the Lamb on Mount Sion and the restoration of the gospel provides a message of triumph." },
  { ch:15, dom:'Admonition', rat:"The preparation of the seven last plagues signifies the finality of God's judgment on the unrepentant world." },
  { ch:16, dom:'Admonition', rat:"The pouring of the seven vials results in unprecedented suffering and the gathering for the final battle." },
  { ch:17, dom:'Admonition', rat:"The description of Babylon the Great as a harlot serves as a stark warning against spiritual and worldly corruption." },
  { ch:18, dom:'Admonition', rat:"The lamentation over the sudden fall of Babylon emphasizes the vanity of worldly wealth and power." },
  { ch:19, dom:'Peace', rat:"The marriage supper of the Lamb and Christ's triumphant return represent the ultimate victory of righteousness." },
  { ch:20, dom:'Peace', rat:"The description of the Millennium and the final victory over death and hell provides the ultimate hope for the faithful." },
  { ch:21, dom:'Peace', rat:"The vision of the New Jerusalem and the end of sorrow and death represents the pinnacle of celestial joy." },
  { ch:22, dom:'Peace', rat:"The final invitation to partake of the water of life and the promise of the Lord's return conclude the book with hope." },
];

const revSpeakers = [
  { ch:1, sv:1, ev:7, spk:'john-apostle' },
  { ch:1, sv:8, ev:8, spk:'jesus-christ' },
  { ch:1, sv:9, ev:10, spk:'john-apostle' },
  { ch:1, sv:11, ev:11, spk:'jesus-christ' },
  { ch:1, sv:12, ev:16, spk:'john-apostle' },
  { ch:1, sv:17, ev:20, spk:'jesus-christ' },
  { ch:2, sv:1, ev:29, spk:'jesus-christ' },
  { ch:3, sv:1, ev:22, spk:'jesus-christ' },
  { ch:7, sv:14, ev:14, spk:'john-apostle' },
  { ch:10, sv:9, ev:9, spk:'john-apostle' },
  { ch:11, sv:3, ev:12, spk:'jesus-christ' },
  { ch:16, sv:15, ev:15, spk:'jesus-christ' },
  { ch:18, sv:4, ev:20, spk:'jesus-christ' },
  { ch:21, sv:5, ev:8, spk:'god-the-father' },
  { ch:22, sv:7, ev:7, spk:'jesus-christ' },
  { ch:22, sv:8, ev:8, spk:'john-apostle' },
  { ch:22, sv:12, ev:16, spk:'jesus-christ' },
  { ch:22, sv:18, ev:20, spk:'jesus-christ' },
  { ch:22, sv:20, ev:21, spk:'john-apostle' },
];

const revSummaries = {
  1: "John records his vision of the glorified Jesus Christ on the isle of Patmos. The Savior appears amidst seven golden candlesticks, holding seven stars, and commands John to write his visions to the seven churches in Asia.",
  2: "Jesus delivers specific messages to the churches in Ephesus, Smyrna, Pergamos, and Thyatira. He commends their labors, rebukes their failings (such as losing first love or following false doctrine), and promises rewards to those who overcome.",
  3: "The Savior addresses the churches in Sardis, Philadelphia, and Laodicea. He warns against spiritual death and lukewarmness, commends those who keep His word, and invites all to open the door and sup with Him.",
  4: "John is caught up to heaven and sees the throne of God surrounded by a rainbow. He describes twenty-four elders and four beasts who cease not to worship the Almighty, the Creator of all things.",
  5: "John sees a book sealed with seven seals in the hand of Him on the throne. Only the Lamb (Jesus Christ) is found worthy to open the seals, sparking a universal chorus of praise for His redemptive sacrifice.",
  6: "The Lamb opens the first six seals, revealing visions of conquest, war, famine, death, the souls of martyrs, and a great earthquake. These represent various epochs and judgments throughout the earth's history.",
  7: "Four angels hold back the winds while 144,000 of the tribes of Israel are sealed. John then sees a countless multitude from every nation, clothed in white, who have come out of great tribulation and are served by God.",
  8: "The opening of the seventh seal begins with silence in heaven. Seven angels receive trumpets. The first four sound, bringing destruction to the trees, sea, rivers, and celestial bodies, accompanied by a warning of woes.",
  9: "The fifth and sixth trumpets sound, releasing demonic locusts to torment men and a massive army that slays a third of mankind. Despite these plagues, the survivors refuse to repent of their idolatry and wickedness.",
  10: "A mighty angel with a little book appears and declares that time shall be no longer. John is commanded to eat the book, which is sweet in his mouth but bitter in his belly, symbolizing his mission to many nations.",
  11: "John measures the temple. Two witnesses prophesy and are slain in Jerusalem, only to be resurrected after three days. The seventh trumpet sounds, announcing that the kingdoms of this world are become the kingdoms of Christ.",
  12: "John sees a woman clothed with the sun who gives birth to a child. The dragon tries to devour the child but is cast out of heaven by Michael. The dragon then persecutes the woman and her seed on the earth.",
  13: "A beast rises from the sea with seven heads and ten horns, followed by a second beast from the earth that performs wonders and requires all to receive a mark (666) to buy or sell, deceiving many through power.",
  14: "The Lamb stands on Mount Sion with the 144,000. Three angels announce the restoration of the gospel, the fall of Babylon, and the judgment upon the beast's followers. The Son of man reaps the harvest of the earth.",
  15: "John sees those who have overcome the beast singing the song of Moses and the Lamb. Seven angels emerge from the heavenly temple, having the seven last plagues, and receive seven golden vials full of the wrath of God.",
  16: "The angels pour out their vials, causing sores, turning the sea and rivers to blood, scorching men with heat, and bringing darkness. The final vial leads to a great earthquake and the gathering for the battle of Armageddon.",
  17: "An angel shows John the judgment of the great harlot, Babylon, who sits upon a scarlet beast. The beast and the ten kings represent worldly powers that will eventually destroy the harlot before being overcome by the Lamb.",
  18: "A mighty angel announces the total fall of Babylon. The kings and merchants of the earth lament the loss of her luxury and commerce. God's people are commanded to come out of her to avoid her plagues and destruction.",
  19: "Heaven rejoices over the judgment of the harlot and the marriage of the Lamb. Jesus Christ, as the Word of God, returns on a white horse with the armies of heaven to destroy the beast and the false prophet.",
  20: "Satan is bound for a thousand years during the Millennium. After a final brief rebellion, he is cast into the lake of fire. All the dead are then judged before the great white throne according to their works recorded in the books.",
  21: "John sees a new heaven and a new earth, and the holy city, New Jerusalem, descending from God. He describes its jasper walls and pearly gates, declaring that God will dwell with His people and wipe away all tears.",
  22: "The angel shows John the river and tree of life in the city. John is warned not to worship the angel and not to seal the prophecy. The Lord Jesus Christ promises to come quickly and invites all to partake of the water of life freely.",
};

const revThemes = {
  1: ["Revelation","Priesthood Authority","The Godhead","Witnessing"],
  2: ["Endurance","Apostasy","Repentance","Reward of the Faithful"],
  3: ["Integrity","Preparedness","Overcoming","Relationship with Christ"],
  4: ["God's Glory","Creation","Celestial Order","Worship"],
  5: ["Atonement","Redemption","Worthiness","Sacrifice"],
  6: ["Signs of the Times","Justice","Tribulation","God's Wrath"],
  7: ["Gathering of Israel","Sealing","Divine Protection","Sanctification"],
  8: ["Judgment","Prayer","Physical Destruction","Preparation"],
  9: ["Spiritual Darkness","Warfare","Hardness of Heart","Divine Decree"],
  10: ["Restoration","Missionary Work","Prophecy","Commitment"],
  11: ["Testimony","Resurrection","Kingship","Victory"],
  12: ["Pre-mortal Life","War in Heaven","Agency","Satanic Opposition"],
  13: ["Deception","Idolatry","Tyranny","Endurance of Saints"],
  14: ["Restoration","Judgment","Purity","Harvest"],
  15: ["Victory","Justice","Ordinances","Divine Glory"],
  16: ["Consequences of Sin","Final Battle","God's Power","Hardness of Heart"],
  17: ["Worldliness","Apostasy","Deception","Divine Justice"],
  18: ["Materialism","Judgment","Separation from the World","Lamentation"],
  19: ["Second Coming","Marriage Covenant","Triumph","Judgment"],
  20: ["Millennium","Resurrection","Accountability","Final Judgment"],
  21: ["Celestial Kingdom","New Creation","Peace","God's Dwelling"],
  22: ["Eternal Life","Invitation","Fulfillment","Sacredness of Scripture"],
};

const revHistorical = {
  1: "Written by John while exiled on the island of Patmos during a period of intense Roman persecution, likely under Emperor Domitian.",
  2: "Addresses the specific geographical and cultural challenges facing Christian congregations in the Roman province of Asia Minor.",
  3: "Reflects the socio-economic environment of cities like Laodicea, known for their wealth, banking, and medical advancements.",
  4: "Draws on ancient temple imagery and the divine council motif common in Near Eastern and Israelite literature.",
  5: "Utilizes the legal practice of sealed scrolls (wills or deeds) which required specific authority to open.",
  6: "The imagery of the four horsemen reflects the common historical plagues of the Roman world: military conquest, civil war, famine, and pestilence.",
  7: "Echoes the ritual and cultural expectations of the gathering of the scattered tribes of Israel.",
  8: "Trumpets were used in ancient Israel for gathering, alarm, and temple ritual, signaling a divine call to attention.",
  9: "The description of the locust-like army may reflect the terrifying border raids and military tech of the 1st-century East.",
  10: "Relates to the biblical tradition of prophets (like Ezekiel) being commissioned through the eating of a scroll.",
  11: "Mentions the city where also our Lord was crucified, identifying Jerusalem as a central stage for final events.",
  12: "The War in Heaven is contextualized in LDS theology as the pre-mortal conflict over agency and the Plan of Salvation.",
  13: "The mark of the beast and the number 666 are often linked to the political and economic pressures of the Roman imperial cult.",
  14: "The angel with the everlasting gospel is a pivotal historical marker in the LDS narrative of the Restoration.",
  15: "The Song of Moses celebrates Israel's deliverance from Egypt, here used as a pattern for the final deliverance of the Saints.",
  16: "The location of Armageddon (Har Megiddo) was a historic site of numerous decisive battles in Israel's history.",
  17: "Babylon was the historic enemy of Jerusalem, used here as a code for Rome and for all worldly systems that oppose God.",
  18: "The catalog of goods (v. 12-13) reflects the vast Mediterranean trade network that enriched the Roman Empire at the expense of others.",
  19: "The marriage supper imagery draws from Jewish wedding customs where the groom's return is the climax of the celebration.",
  20: "The concept of a Millennium (a thousand-year peace) is a foundational expectation in the Latter-day Saint view of the future.",
  21: "The description of the city uses the same measurements and materials (gold, gems) associated with the Holy of Holies in the Temple.",
  22: "The closing warnings against adding or taking away from the prophecy were standard literary formulas for protecting sacred texts.",
};

const revGenres = {
  1: "Apocalyptic / Epistle", 2: "Apocalyptic / Epistle", 3: "Apocalyptic / Epistle",
  4: "Apocalyptic / Vision", 5: "Apocalyptic / Vision", 6: "Apocalyptic / Vision",
  7: "Apocalyptic / Vision", 8: "Apocalyptic / Vision", 9: "Apocalyptic / Vision",
  10: "Apocalyptic / Vision", 11: "Apocalyptic / Prophecy", 12: "Apocalyptic / Mythic-Narrative",
  13: "Apocalyptic / Vision", 14: "Apocalyptic / Vision", 15: "Apocalyptic / Vision",
  16: "Apocalyptic / Vision", 17: "Apocalyptic / Vision", 18: "Apocalyptic / Lament",
  19: "Apocalyptic / Narrative", 20: "Apocalyptic / Narrative", 21: "Apocalyptic / Description",
  22: "Apocalyptic / Epilogue",
};

const revDoctrinal = {
  1: ["Godhead","Priesthood Keys","Revelation"],
  2: ["Apostasy","Endurance","Repentance"],
  3: ["Integrity","Celestial Kingdom","Atonement"],
  4: ["Creation","Worship","Celestial Kingdom"],
  5: ["At-one-ment","Redemption","Jesus Christ as Creator"],
  6: ["Signs of the Times","Justice","Tribulation"],
  7: ["Gathering of Israel","Sealing","Ordinances"],
  8: ["Judgment","Prayer","Elements"],
  9: ["Agency","Idolatry","Spiritual Warfare"],
  10: ["Restoration","Missionary Work","Personal Revelation"],
  11: ["Testimony","Priesthood Power","Second Coming"],
  12: ["Pre-mortal Life","Agency","War in Heaven"],
  13: ["Deception","Oppression","Endurance"],
  14: ["Restoration of the Gospel","Judgment","Charity"],
  15: ["Celestial Order","Victory","God's Attributes"],
  16: ["Justice","Armageddon","Second Coming"],
  17: ["Apostasy","Worldliness","Corruption"],
  18: ["Accountability","Materialism","Separation"],
  19: ["Second Coming","Covenants","Judgment"],
  20: ["Millennium","Resurrection","Final Judgment"],
  21: ["Exaltation","Celestial Kingdom","Creation"],
  22: ["Eternal Life","Agency","Invitation to Christ"],
};

const revNotable = {
  1: [{ verse: 8, reason: "The Lord declares He is Alpha and Omega, the beginning and the ending." },
      { verse: 18, reason: "Christ announces He is alive forevermore and holds the keys of hell and of death." }],
  2: [{ verse: 10, reason: "Be thou faithful unto death, and I will give thee a crown of life." },
      { verse: 17, reason: "To him that overcometh will I give to eat of the hidden manna and a white stone with a new name." }],
  3: [{ verse: 15, reason: "I know thy works, that thou art neither cold nor hot: I would thou wert cold or hot." },
      { verse: 20, reason: "Behold, I stand at the door, and knock: if any man hear my voice, and open the door, I will come in." }],
  4: [{ verse: 8, reason: "Holy, holy, holy, Lord God Almighty, which was, and is, and is to come." },
      { verse: 11, reason: "Thou art worthy, O Lord, to receive glory and honour and power: for thou hast created all things." }],
  5: [{ verse: 5, reason: "The Lion of the tribe of Juda, the Root of David, hath prevailed to open the book." },
      { verse: 9, reason: "Thou art worthy... for thou wast slain, and hast redeemed us to God by thy blood." }],
  6: [{ verse: 10, reason: "The martyrs cry, How long, O Lord, holy and true, dost thou not judge and avenge our blood?" },
      { verse: 17, reason: "The great day of his wrath is come; and who shall be able to stand?" }],
  7: [{ verse: 14, reason: "These are they which came out of great tribulation, and have washed their robes in the blood of the Lamb." },
      { verse: 17, reason: "God shall wipe away all tears from their eyes." }],
  8: [{ verse: 1, reason: "When the seventh seal was opened, there was silence in heaven about the space of half an hour." }],
  9: [{ verse: 20, reason: "The survivors still repented not of the works of their hands." }],
  10: [{ verse: 6, reason: "The angel declares that there should be time no longer." },
       { verse: 10, reason: "The little book is sweet as honey in the mouth but bitter in the belly." }],
  11: [{ verse: 15, reason: "The kingdoms of this world are become the kingdoms of our Lord, and of his Christ." }],
  12: [{ verse: 7, reason: "There was war in heaven: Michael and his angels fought against the dragon." },
       { verse: 11, reason: "They overcame him by the blood of the Lamb, and by the word of their testimony." }],
  13: [{ verse: 8, reason: "All that dwell upon the earth shall worship the beast, whose names are not written in the book of life." },
       { verse: 18, reason: "The number of the beast is six hundred threescore and six." }],
  14: [{ verse: 6, reason: "An angel flies with the everlasting gospel to preach unto them that dwell on the earth." },
       { verse: 12, reason: "Here is the patience of the saints: here are they that keep the commandments of God." }],
  15: [{ verse: 3, reason: "They sing the song of Moses and the song of the Lamb, praising God's justice." }],
  16: [{ verse: 15, reason: "Behold, I come as a thief. Blessed is he that watcheth, and keepeth his garments." },
       { verse: 16, reason: "He gathered them together into a place called in the Hebrew tongue Armageddon." }],
  17: [{ verse: 14, reason: "The Lamb shall overcome them: for he is Lord of lords, and King of kings." }],
  18: [{ verse: 2, reason: "Babylon the great is fallen, is fallen." },
       { verse: 4, reason: "Come out of her, my people, that ye be not partakers of her sins." }],
  19: [{ verse: 7, reason: "The marriage of the Lamb is come, and his wife hath made herself ready." },
       { verse: 16, reason: "On his vesture and on his thigh a name written, KING OF KINGS, AND LORD OF LORDS." }],
  20: [{ verse: 12, reason: "The dead were judged out of those things which were written in the books, according to their works." },
       { verse: 14, reason: "Death and hell were cast into the lake of fire. This is the second death." }],
  21: [{ verse: 1, reason: "I saw a new heaven and a new earth: for the first heaven and the first earth were passed away." },
       { verse: 4, reason: "God shall wipe away all tears from their eyes; and there shall be no more death." }],
  22: [{ verse: 12, reason: "Behold, I come quickly; and my reward is with me, to give every man according as his work shall be." },
       { verse: 17, reason: "The Spirit and the bride say, Come. And let him that is athirst come. And whosoever will, let him take the water of life freely." }],
};

const revCrossRefs = [
  { ch: 1, verse: 7, ref: "D&C 76:20-24", type: "parallel", note: "Both passages describe the glorified, resurrected Christ appearing to prophets." },
  { ch: 4, verse: 6, ref: "D&C 77:1-5", type: "commentary", note: "D&C 77 provides direct, revealed answers to John's questions about the symbols in Revelation 4." },
  { ch: 5, verse: 1, ref: "D&C 77:6-7", type: "commentary", note: "The sealed book is identified as containing God's will and the history of the earth in its seven thousand years." },
  { ch: 7, verse: 4, ref: "D&C 77:11", type: "commentary", note: "The 144,000 are identified as high priests ordained to administer the everlasting gospel." },
  { ch: 10, verse: 2, ref: "D&C 77:14", type: "commentary", note: "The little book John ate is identified as a mission to gather Israel in the last days." },
  { ch: 12, verse: 7, ref: "Moses 4:1-4", type: "parallel", note: "Moses provides the pre-mortal context for Satan's rebellion and the War in Heaven." },
  { ch: 14, verse: 6, ref: "D&C 133:36-39", type: "parallel", note: "Both passages describe the angel flying through the midst of heaven with the everlasting gospel." },
  { ch: 19, verse: 7, ref: "D&C 132:19", type: "doctrinal", note: "The marriage of the Lamb is illuminated by the doctrine of celestial/eternal marriage." },
  { ch: 20, verse: 4, ref: "D&C 101:26-34", type: "parallel", note: "Both describe conditions during the Millennium, including peace and the binding of Satan." },
  { ch: 21, verse: 2, ref: "Ether 13:1-12", type: "parallel", note: "Ether's vision of the New Jerusalem parallels John's, identifying it as a holy city for the righteous." },
];

// ============================================================
// ROMANS DATA (16 chapters)
// ============================================================
const ROM = { book: 'Romans', vol: 'NT', volName: 'New Testament', bookId: 45, chapters: 16 };

const romSentiments = [
  { ch:1, dom:'Admonition', rat:"Paul establishes the apostasy of mankind and God's wrath against those who suppress the truth in unrighteousness." },
  { ch:2, dom:'Admonition', rat:"Paul warns that all people, Jew and Gentile alike, will be judged impartially by God according to their works and hearts." },
  { ch:3, dom:'Admonition', rat:"Paul demonstrates that all have sinned and fall short of the glory of God, establishing the universal need for grace." },
  { ch:4, dom:'Peace', rat:"Abraham is presented as the great example of justification by faith, providing assurance that God's promises are sure." },
  { ch:5, dom:'Peace', rat:"Paul declares that through Christ's atonement, believers have peace with God, and grace abounds even more than sin." },
  { ch:6, dom:'Admonition', rat:"Paul challenges believers to die to sin and live unto God, warning against using grace as a license for continued sin." },
  { ch:7, dom:'Admonition', rat:"Paul describes the internal struggle with sin and the inability of the law alone to bring salvation." },
  { ch:8, dom:'Peace', rat:"Paul delivers one of the most hopeful chapters in scripture: no condemnation in Christ, and nothing can separate us from God's love." },
  { ch:9, dom:'Admonition', rat:"Paul wrestles with Israel's rejection of Christ and affirms God's sovereign right to show mercy to whom He will." },
  { ch:10, dom:'Admonition', rat:"Paul urges the preaching of the gospel, declaring that faith cometh by hearing, and hearing by the word of God." },
  { ch:11, dom:'Peace', rat:"Paul teaches that Israel's fall is not permanent — the natural branches will be grafted in again, revealing God's ultimate mercy." },
  { ch:12, dom:'Admonition', rat:"Paul commands believers to present their bodies as a living sacrifice, outlining practical duties of Christian conduct." },
  { ch:13, dom:'Admonition', rat:"Paul instructs obedience to civil authorities and urges the saints to put on the armour of light and walk honestly." },
  { ch:14, dom:'Admonition', rat:"Paul warns against judging one another over disputable matters and calls for mutual edification and charity." },
  { ch:15, dom:'Peace', rat:"Paul expresses hope and unity, emphasizing that Christ is the minister of both Jew and Gentile and asking for prayers." },
  { ch:16, dom:'Peace', rat:"Paul closes with warm greetings to numerous saints, commending their faithful service and expressing confidence in God's grace." },
];

const romSpeakers = [
  { ch:1, sv:1, ev:32, spk:'paul' },
  { ch:2, sv:1, ev:29, spk:'paul' },
  { ch:3, sv:1, ev:31, spk:'paul' },
  { ch:4, sv:1, ev:25, spk:'paul' },
  { ch:5, sv:1, ev:21, spk:'paul' },
  { ch:6, sv:1, ev:23, spk:'paul' },
  { ch:7, sv:1, ev:25, spk:'paul' },
  { ch:8, sv:1, ev:39, spk:'paul' },
  { ch:9, sv:1, ev:33, spk:'paul' },
  { ch:10, sv:1, ev:21, spk:'paul' },
  { ch:11, sv:1, ev:36, spk:'paul' },
  { ch:12, sv:1, ev:21, spk:'paul' },
  { ch:13, sv:1, ev:14, spk:'paul' },
  { ch:14, sv:1, ev:23, spk:'paul' },
  { ch:15, sv:1, ev:33, spk:'paul' },
  { ch:16, sv:1, ev:21, spk:'paul' },
  { ch:16, sv:22, ev:22, spk:'tertius' },
  { ch:16, sv:23, ev:27, spk:'paul' },
];

const romSummaries = {
  1: "Paul introduces himself as an apostle called to preach the gospel. He declares the gospel is God's power unto salvation and exposes the wickedness of those who reject God, describing their descent into idolatry and moral corruption.",
  2: "Paul argues that God judges all people impartially. Both Jews who have the law and Gentiles who follow their conscience will be judged by the same standard — the condition of their hearts, not outward observance alone.",
  3: "Paul proves that all — both Jews and Gentiles — are under sin and that no one is justified by the works of the law. Righteousness comes through faith in Jesus Christ, for all have sinned and fall short of God's glory.",
  4: "Paul uses Abraham as the supreme example of justification by faith, not by works. Abraham believed God, and it was counted to him for righteousness — a pattern for all who believe in Christ's resurrection.",
  5: "Paul teaches that through Christ's atonement, believers are justified and have peace with God. As Adam's transgression brought death to all, so Christ's sacrifice brings the free gift of grace and eternal life to all.",
  6: "Paul asks whether believers should continue in sin that grace may abound. He emphatically answers no — those baptized into Christ have died to sin and should walk in newness of life, serving righteousness.",
  7: "Paul explains that the law reveals sin but cannot save. He describes the painful inner conflict of knowing the good but being unable to do it, concluding that deliverance comes only through Jesus Christ.",
  8: "Paul declares there is no condemnation for those in Christ Jesus. He teaches that the Spirit gives life, that believers are joint-heirs with Christ, and that nothing can separate the faithful from God's love.",
  9: "Paul expresses deep sorrow over Israel's unbelief. He affirms God's sovereignty in choosing to whom He extends mercy, using the examples of Jacob and Esau and the potter's authority over the clay.",
  10: "Paul declares that salvation is available to all who confess with their mouth and believe in their heart. He emphasizes the necessity of preaching, for faith cometh by hearing the word of God.",
  11: "Paul assures that God has not cast away His people Israel. Using the olive tree allegory, he teaches that Gentile believers are grafted in and warns against boasting, for God's gifts and calling are irrevocable.",
  12: "Paul urges believers to present their bodies as living sacrifices and be transformed by the renewing of their minds. He outlines the use of spiritual gifts, genuine love, humility, and overcoming evil with good.",
  13: "Paul commands submission to governing authorities as ordained of God. He urges believers to love one another (fulfilling the law), put off works of darkness, and put on the armour of light, for salvation is near.",
  14: "Paul addresses disputes over food and holy days, teaching that the kingdom of God is not about these things but about righteousness, peace, and joy. He warns against judging others and causing them to stumble.",
  15: "Paul encourages mutual acceptance and glorifying God with one voice. He summarizes his ministry to the Gentiles, shares his travel plans to visit Rome and Spain, and requests their prayers.",
  16: "Paul commends Phoebe and greets many saints in Rome by name. Tertius adds his own greeting as the scribe. Paul warns against those who cause divisions and closes with a doxology praising God's eternal wisdom.",
};

const romThemes = {
  1: ["Gospel Power","Apostasy","God's Wrath","Idolatry"],
  2: ["Impartial Judgment","Conscience","Hypocrisy","Heart Religion"],
  3: ["Universal Sinfulness","Justification by Faith","Grace","The Law"],
  4: ["Faith","Covenant Promises","Abraham","Imputed Righteousness"],
  5: ["Atonement","Grace","Peace with God","Adam and Christ"],
  6: ["Baptism","Death to Sin","Newness of Life","Obedience"],
  7: ["The Law","Inner Conflict","Sin","Deliverance through Christ"],
  8: ["No Condemnation","Holy Spirit","Joint-Heirs","God's Love"],
  9: ["God's Sovereignty","Election","Israel","Mercy"],
  10: ["Confession","Faith","Preaching the Gospel","Universality of Salvation"],
  11: ["Olive Tree","Grafting","Israel's Future","God's Mercy"],
  12: ["Living Sacrifice","Spiritual Gifts","Charity","Overcoming Evil"],
  13: ["Civil Obedience","Love","Armour of Light","Urgency"],
  14: ["Judging Others","Conscience","Liberty","Edification"],
  15: ["Unity","Hope","Gentile Mission","Prayer"],
  16: ["Fellowship","Greetings","Warning against Division","Doxology"],
};

const romHistorical = {
  1: "Written by Paul from Corinth around AD 57, this epistle addresses a church he had not yet visited, establishing his doctrinal credentials.",
  2: "Reflects the tension in Rome between Jewish and Gentile Christians regarding the role of the Mosaic law in the new covenant.",
  3: "Paul's argument draws heavily on Old Testament scripture, demonstrating mastery of the Jewish legal and prophetic tradition.",
  4: "Abraham was revered by Jews, proselytes, and God-fearers alike in Rome, making him a unifying example for Paul's mixed audience.",
  5: "The Adam-Christ typology was central to early Christian theology and is foundational to the LDS understanding of the Fall and Atonement.",
  6: "Early Christian baptism by immersion symbolized death, burial, and resurrection — a practice Paul assumed his Roman readers understood.",
  7: "Paul's description of the inner struggle may reflect both personal experience and a rhetorical style common in Greco-Roman moral philosophy.",
  8: "The promise of no condemnation was especially meaningful to a community living under the shadow of Roman imperial judgment.",
  9: "Paul's anguish over Israel reflects the deep division between the early Church and the synagogue in the mid-first century.",
  10: "The emphasis on preaching and hearing reflects the oral culture of the ancient world, where literacy was limited and public proclamation was key.",
  11: "The olive tree was a well-known symbol of Israel. Paul's grafting metaphor would have resonated with both Jewish and agricultural audiences.",
  12: "The ethical exhortations mirror the household codes and moral instruction common in both Jewish wisdom and Greco-Roman philosophy.",
  13: "The command to submit to authorities was written under Nero's early, relatively peaceful reign, before the great persecution.",
  14: "The 'weak' and 'strong' likely reflect real tensions in the Roman church over Jewish food laws and Sabbath observance.",
  15: "Paul's mention of Spain reveals his ambitious missionary strategy to reach the western edge of the known Roman world.",
  16: "The long list of personal greetings reveals a remarkably diverse and interconnected early Christian network across the Mediterranean.",
};

const romGenres = {
  1: "Epistle / Theological Treatise", 2: "Epistle / Theological Argument", 3: "Epistle / Theological Argument",
  4: "Epistle / Midrash", 5: "Epistle / Theological Treatise", 6: "Epistle / Ethical Exhortation",
  7: "Epistle / Autobiographical Reflection", 8: "Epistle / Theological Climax", 9: "Epistle / Theological Lament",
  10: "Epistle / Exhortation", 11: "Epistle / Allegory", 12: "Epistle / Paraenesis",
  13: "Epistle / Paraenesis", 14: "Epistle / Pastoral Counsel", 15: "Epistle / Travelogue",
  16: "Epistle / Personal Greetings",
};

const romDoctrinal = {
  1: ["Gospel","Apostleship","Apostasy"],
  2: ["Judgment","Agency","Accountability"],
  3: ["Justification","Grace","Atonement"],
  4: ["Faith","Covenant","Imputed Righteousness"],
  5: ["Atonement","Fall of Adam","Grace"],
  6: ["Baptism","Sanctification","Obedience"],
  7: ["The Law","Natural Man","Redemption"],
  8: ["Holy Ghost","Adoption","Eternal Life"],
  9: ["Foreordination","Agency","God's Sovereignty"],
  10: ["Missionary Work","Faith","Confession"],
  11: ["Gathering of Israel","Restoration","Mercy"],
  12: ["Consecration","Charity","Spiritual Gifts"],
  13: ["Law of the Land","Love","Second Coming"],
  14: ["Charity","Conscience","Agency"],
  15: ["Unity","Hope","Ministry"],
  16: ["Fellowship","Watchfulness","God's Glory"],
};

const romNotable = {
  1: [{ verse: 16, reason: "I am not ashamed of the gospel of Christ: for it is the power of God unto salvation." },
      { verse: 17, reason: "The just shall live by faith — a cornerstone of Paul's entire theological argument." }],
  2: [{ verse: 6, reason: "God will render to every man according to his deeds." },
      { verse: 29, reason: "He is a Jew, which is one inwardly; and circumcision is that of the heart." }],
  3: [{ verse: 23, reason: "For all have sinned, and come short of the glory of God — one of the most quoted verses in Christianity." }],
  4: [{ verse: 3, reason: "Abraham believed God, and it was counted unto him for righteousness." }],
  5: [{ verse: 8, reason: "While we were yet sinners, Christ died for us." },
      { verse: 20, reason: "Where sin abounded, grace did much more abound." }],
  6: [{ verse: 4, reason: "We are buried with him by baptism into death: that we should walk in newness of life." },
      { verse: 23, reason: "The wages of sin is death; but the gift of God is eternal life through Jesus Christ." }],
  7: [{ verse: 19, reason: "The good that I would I do not: but the evil which I would not, that I do." },
      { verse: 24, reason: "O wretched man that I am! who shall deliver me from the body of this death?" }],
  8: [{ verse: 1, reason: "There is therefore now no condemnation to them which are in Christ Jesus." },
      { verse: 28, reason: "All things work together for good to them that love God." },
      { verse: 38, reason: "Neither death, nor life... shall be able to separate us from the love of God." }],
  9: [{ verse: 21, reason: "Hath not the potter power over the clay?" }],
  10: [{ verse: 9, reason: "If thou shalt confess with thy mouth the Lord Jesus, and believe in thine heart... thou shalt be saved." },
       { verse: 17, reason: "Faith cometh by hearing, and hearing by the word of God." }],
  11: [{ verse: 33, reason: "O the depth of the riches both of the wisdom and knowledge of God! how unsearchable are his judgments." },
       { verse: 36, reason: "For of him, and through him, and to him, are all things: to whom be glory for ever." }],
  12: [{ verse: 1, reason: "Present your bodies a living sacrifice, holy, acceptable unto God, which is your reasonable service." },
       { verse: 21, reason: "Be not overcome of evil, but overcome evil with good." }],
  13: [{ verse: 10, reason: "Love is the fulfilling of the law." },
       { verse: 14, reason: "Put ye on the Lord Jesus Christ, and make not provision for the flesh." }],
  14: [{ verse: 10, reason: "We shall all stand before the judgment seat of Christ." },
       { verse: 17, reason: "The kingdom of God is not meat and drink; but righteousness, and peace, and joy in the Holy Ghost." }],
  15: [{ verse: 1, reason: "We then that are strong ought to bear the infirmities of the weak, and not to please ourselves." },
       { verse: 13, reason: "Now the God of hope fill you with all joy and peace in believing." }],
  16: [{ verse: 17, reason: "Mark them which cause divisions and offences contrary to the doctrine which ye have learned; and avoid them." }],
};

const romCrossRefs = [
  { ch: 1, verse: 17, ref: "Habakkuk 2:4", type: "quotation", note: "Paul quotes Habakkuk's declaration that the just shall live by faith as the thesis of his epistle." },
  { ch: 3, verse: 23, ref: "2 Nephi 2:21", type: "parallel", note: "Both passages teach the universal fallen state of mankind and the necessity of divine grace." },
  { ch: 5, verse: 12, ref: "Moses 6:48-62", type: "parallel", note: "Both passages explain the Fall of Adam and its effects upon all humanity, with redemption through Christ." },
  { ch: 8, verse: 17, ref: "D&C 76:58-60", type: "parallel", note: "Joint-heirs with Christ inherit the celestial kingdom, receiving all that the Father hath." },
  { ch: 10, verse: 17, ref: "Alma 32:21-43", type: "parallel", note: "Both passages develop the relationship between faith, hearing the word, and spiritual growth." },
  { ch: 11, verse: 17, ref: "Jacob 5:1-77", type: "parallel", note: "The Allegory of the Olive Tree in Jacob is the most extensive parallel to Paul's olive tree metaphor." },
  { ch: 12, verse: 1, ref: "Moroni 10:32", type: "parallel", note: "Both passages call believers to consecrate themselves wholly to God through Christ's grace." },
];

// ============================================================
// TITUS DATA (3 chapters)
// ============================================================
const TIT = { book: 'Titus', vol: 'NT', volName: 'New Testament', bookId: 56, chapters: 3 };

const titSentiments = [
  { ch:1, dom:'Admonition', rat:"Paul instructs Titus on the qualifications for church leaders and warns against false teachers who must be silenced." },
  { ch:2, dom:'Admonition', rat:"Paul gives specific behavioral instructions for different groups within the congregation, grounded in the grace of God." },
  { ch:3, dom:'Admonition', rat:"Paul urges submission to authorities, good works, and avoidance of unprofitable disputes, emphasizing God's mercy in saving us." },
];

const titSpeakers = [
  { ch:1, sv:1, ev:16, spk:'paul' },
  { ch:2, sv:1, ev:15, spk:'paul' },
  { ch:3, sv:1, ev:15, spk:'paul' },
];

const titSummaries = {
  1: "Paul greets Titus and reminds him of his assignment in Crete: to set things in order and ordain elders in every city. He outlines the qualifications for bishops and warns against deceivers, especially those of the circumcision.",
  2: "Paul instructs Titus to teach sound doctrine to different groups — aged men, aged women, young women, young men, and servants. He grounds all behavior in the grace of God, which teaches us to live soberly and righteously.",
  3: "Paul urges Titus to remind the Saints to be subject to authorities, to be gentle, and to avoid foolish controversies. He declares that God saved us by His mercy through the washing of regeneration and the Holy Ghost.",
};

const titThemes = {
  1: ["Priesthood Leadership","Sound Doctrine","Apostasy","Qualifications for Ministry"],
  2: ["Godly Living","Grace","Self-Discipline","Example"],
  3: ["Mercy","Good Works","Obedience","Regeneration"],
};

const titHistorical = {
  1: "Crete was known in antiquity for moral looseness; even a Cretan prophet admitted his own people were liars and gluttons.",
  2: "The household instructions (Haustafel) mirror Greco-Roman social expectations, adapted here to a Christian framework.",
  3: "The emphasis on submission to rulers may reflect the precarious social position of Christians in the Roman province of Crete.",
};

const titGenres = {
  1: "Epistle / Pastoral Instruction",
  2: "Epistle / Paraenesis",
  3: "Epistle / Theological Summary",
};

const titDoctrinal = {
  1: ["Priesthood","Church Organization","Apostasy"],
  2: ["Grace","Sanctification","Obedience"],
  3: ["Mercy","Baptism","Good Works"],
};

const titNotable = {
  1: [{ verse: 2, reason: "In hope of eternal life, which God, that cannot lie, promised before the world began." },
      { verse: 15, reason: "Unto the pure all things are pure." }],
  2: [{ verse: 11, reason: "The grace of God that bringeth salvation hath appeared to all men." },
      { verse: 14, reason: "Who gave himself for us, that he might redeem us from all iniquity and purify unto himself a peculiar people." }],
  3: [{ verse: 5, reason: "Not by works of righteousness which we have done, but according to his mercy he saved us." }],
};

const titCrossRefs = [
  { ch: 1, verse: 7, ref: "D&C 121:41-44", type: "parallel", note: "Both passages describe the character qualifications and righteous conduct required of priesthood leaders." },
  { ch: 2, verse: 11, ref: "2 Nephi 25:23", type: "parallel", note: "Both teach that salvation comes through grace, with the expectation of faithful effort on the believer's part." },
  { ch: 3, verse: 5, ref: "Mosiah 27:24-28", type: "parallel", note: "Both passages describe the spiritual rebirth and transformation that comes through God's mercy, not man's merit." },
];


// ============================================================
// PROCESSING
// ============================================================
console.log('=== Processing 3 NT Books: Revelation, Romans, Titus ===\n');

const allBooks = [
  { meta: REV, sentiments: revSentiments, speakers: revSpeakers, summaries: revSummaries, themes: revThemes, historical: revHistorical, genres: revGenres, doctrinal: revDoctrinal, notable: revNotable, crossRefs: revCrossRefs },
  { meta: ROM, sentiments: romSentiments, speakers: romSpeakers, summaries: romSummaries, themes: romThemes, historical: romHistorical, genres: romGenres, doctrinal: romDoctrinal, notable: romNotable, crossRefs: romCrossRefs },
  { meta: TIT, sentiments: titSentiments, speakers: titSpeakers, summaries: titSummaries, themes: titThemes, historical: titHistorical, genres: titGenres, doctrinal: titDoctrinal, notable: titNotable, crossRefs: titCrossRefs },
];

// 1. SENTIMENTS
console.log('1. Chapter Sentiments');
const sentData = readJSON('chapter-sentiments.json');
for (const b of allBooks) {
  const { meta } = b;
  // Remove any existing entries for this book
  const filtered = sentData.filter(e => !(e.bookName === meta.book && e.volumeAbbrev === meta.vol));
  const newEntries = b.sentiments.map(s => {
    const scores = sentimentScores(s.dom);
    return {
      volumeAbbrev: meta.vol,
      volumeName: meta.volName,
      bookName: meta.book,
      bookId: null,
      chapter: s.ch,
      ...scores,
      dominant: s.dom.toLowerCase(),
      rationale: s.rat,
    };
  });
  sentData.length = 0;
  sentData.push(...filtered, ...newEntries);
  console.log(`  Added ${newEntries.length} sentiments for ${meta.book}`);
}
writeJSON('chapter-sentiments.json', sentData);

// 2. SPEAKERS
console.log('\n2. Speakers');
const spkData = readJSON('speakers.json');
for (const b of allBooks) {
  const { meta } = b;
  const filtered = spkData.filter(e => !(e.book === meta.book && e.volumeAbbrev === meta.vol));
  const newEntries = b.speakers.map(s => ({
    book: meta.book,
    chapter: s.ch,
    speaker: speakerNames[s.spk] || s.spk,
    volumeAbbrev: meta.vol,
    volumeName: meta.volName,
    bookId: null,
    startVerse: s.sv,
    endVerse: s.ev,
  }));
  spkData.length = 0;
  spkData.push(...filtered, ...newEntries);
  console.log(`  Added ${newEntries.length} speakers for ${meta.book}`);
}
writeJSON('speakers.json', spkData);

// 3. SUMMARIES
console.log('\n3. Chapter Summaries');
const sumData = readJSON('chapter-summaries.json');
for (const b of allBooks) {
  const { meta } = b;
  const filtered = sumData.filter(e => !(e.book === meta.book && e.volumeAbbrev === meta.vol));
  const newEntries = Object.entries(b.summaries).map(([ch, summary]) => ({
    book: meta.book,
    chapter: parseInt(ch),
    summary,
    volumeAbbrev: meta.vol,
    volumeName: meta.volName,
    bookId: null,
  }));
  sumData.length = 0;
  sumData.push(...filtered, ...newEntries);
  console.log(`  Added ${newEntries.length} summaries for ${meta.book}`);
}
writeJSON('chapter-summaries.json', sumData);

// 4. THEMES
console.log('\n4. Chapter Themes');
const themeData = readJSON('chapter-themes.json');
for (const b of allBooks) {
  const { meta } = b;
  const filtered = themeData.filter(e => !(e.book === meta.book && e.volumeAbbrev === meta.vol));
  const newEntries = Object.entries(b.themes).map(([ch, themes]) => ({
    book: meta.book,
    chapter: parseInt(ch),
    themes,
    volumeAbbrev: meta.vol,
    volumeName: meta.volName,
    bookId: null,
  }));
  themeData.length = 0;
  themeData.push(...filtered, ...newEntries);
  console.log(`  Added ${newEntries.length} themes for ${meta.book}`);
}
writeJSON('chapter-themes.json', themeData);

// 5. HISTORICAL CONTEXT
console.log('\n5. Historical Context');
const histData = readJSON('historical-context.json');
for (const b of allBooks) {
  const { meta } = b;
  const filtered = histData.filter(e => !(e.book === meta.book && e.volumeAbbrev === meta.vol));
  const newEntries = Object.entries(b.historical).map(([ch, context]) => ({
    book: meta.book,
    chapter: parseInt(ch),
    era: meta.book === 'Revelation' ? 'Early Church' : meta.book === 'Romans' ? 'Pauline Epistles' : 'Pastoral Epistles',
    approxDate: meta.book === 'Revelation' ? 'c. AD 95' : meta.book === 'Romans' ? 'c. AD 57' : 'c. AD 63-65',
    setting: context,
    volumeAbbrev: meta.vol,
    volumeName: meta.volName,
    bookId: null,
  }));
  histData.length = 0;
  histData.push(...filtered, ...newEntries);
  console.log(`  Added ${newEntries.length} historical context for ${meta.book}`);
}
writeJSON('historical-context.json', histData);

// 6. LITERARY GENRES
console.log('\n6. Literary Genres');
const genreData = readJSON('literary-genres.json');
for (const b of allBooks) {
  const { meta } = b;
  const filtered = genreData.filter(e => !(e.book === meta.book && e.volumeAbbrev === meta.vol));
  const newEntries = Object.entries(b.genres).map(([ch, genre]) => {
    const parts = genre.split(' / ');
    return {
      book: meta.book,
      chapter: parseInt(ch),
      genre: parts[0],
      ...(parts[1] ? { subgenre: parts[1] } : {}),
      volumeAbbrev: meta.vol,
      volumeName: meta.volName,
      bookId: null,
    };
  });
  genreData.length = 0;
  genreData.push(...filtered, ...newEntries);
  console.log(`  Added ${newEntries.length} genres for ${meta.book}`);
}
writeJSON('literary-genres.json', genreData);

// 7. DOCTRINAL TOPICS
console.log('\n7. Doctrinal Topics');
const docData = readJSON('doctrinal-topics.json');
for (const b of allBooks) {
  const { meta } = b;
  const filtered = docData.filter(e => !(e.book === meta.book && e.volumeAbbrev === meta.vol));
  const newEntries = Object.entries(b.doctrinal).map(([ch, topics]) => ({
    book: meta.book,
    chapter: parseInt(ch),
    topics,
    volumeAbbrev: meta.vol,
    volumeName: meta.volName,
    bookId: null,
  }));
  docData.length = 0;
  docData.push(...filtered, ...newEntries);
  console.log(`  Added ${newEntries.length} doctrinal topics for ${meta.book}`);
}
writeJSON('doctrinal-topics.json', docData);

// 8. NOTABLE VERSES
console.log('\n8. Notable Verses');
const notData = readJSON('notable-verses.json');
for (const b of allBooks) {
  const { meta } = b;
  const filtered = notData.filter(e => !(e.book === meta.book && e.volumeAbbrev === meta.vol));
  const newEntries = Object.entries(b.notable).map(([ch, verses]) => ({
    book: meta.book,
    chapter: parseInt(ch),
    verses,
    volumeAbbrev: meta.vol,
    volumeName: meta.volName,
    bookId: null,
  }));
  notData.length = 0;
  notData.push(...filtered, ...newEntries);
  console.log(`  Added ${newEntries.length} notable verses for ${meta.book}`);
}
writeJSON('notable-verses.json', notData);

// 9. CROSS REFERENCES
console.log('\n9. Cross References');
const crossData = readJSON('cross-references.json');
for (const b of allBooks) {
  const { meta } = b;
  const filtered = crossData.filter(e => !(e.book === meta.book && e.volumeAbbrev === meta.vol));
  const newEntries = b.crossRefs.map(cr => ({
    book: meta.book,
    chapter: cr.ch,
    verse: cr.verse,
    crossReference: cr.ref,
    type: cr.type,
    note: cr.note,
    volumeAbbrev: meta.vol,
    volumeName: meta.volName,
    bookId: null,
  }));
  crossData.length = 0;
  crossData.push(...filtered, ...newEntries);
  console.log(`  Added ${newEntries.length} cross references for ${meta.book}`);
}
writeJSON('cross-references.json', crossData);

console.log('\n=== All data files updated successfully ===');
