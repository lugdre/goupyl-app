const { encryptJson, decryptJson } = require('../../src/utils/encryption');

describe('utils/encryption — chiffrement AES-256-GCM des réponses PARQ', () => {
  const answers = {
    heartCondition: false,
    chestPain: false,
    dizziness: true,
    jointProblems: false,
    bloodPressureMeds: false,
    otherMedicalReason: false,
    pregnancy: false,
  };

  it('restitue exactement la valeur d\'origine après un aller-retour', () => {
    expect(decryptJson(encryptJson(answers))).toEqual(answers);
  });

  it('gère les types composites (tableaux, imbrication, accents)', () => {
    const value = { liste: [1, 2, 3], imbrique: { clé: 'contre-indication médicale' } };
    expect(decryptJson(encryptJson(value))).toEqual(value);
  });

  it('produit une enveloppe `iv:authTag:ciphertext` en base64', () => {
    const parts = encryptJson(answers).split(':');
    expect(parts).toHaveLength(3);
    expect(Buffer.from(parts[0], 'base64')).toHaveLength(12); // IV GCM
    expect(Buffer.from(parts[1], 'base64')).toHaveLength(16); // authTag
  });

  it('ne laisse fuir aucune réponse en clair dans le chiffré', () => {
    const envelope = encryptJson(answers);
    expect(envelope).not.toContain('heartCondition');
    expect(envelope).not.toContain('true');
  });

  it('produit un chiffré différent à chaque appel (IV aléatoire)', () => {
    expect(encryptJson(answers)).not.toBe(encryptJson(answers));
  });

  describe('robustesse du déchiffrement', () => {
    it('renvoie null si l\'entrée n\'est pas une chaîne', () => {
      expect(decryptJson(null)).toBeNull();
      expect(decryptJson(42)).toBeNull();
      expect(decryptJson({ a: 1 })).toBeNull();
    });

    it('renvoie null si l\'enveloppe n\'a pas 3 segments', () => {
      expect(decryptJson('nimportequoi')).toBeNull();
      expect(decryptJson('aa:bb')).toBeNull();
    });

    it('renvoie null si l\'IV n\'a pas la bonne longueur', () => {
      const [, tag, data] = encryptJson(answers).split(':');
      expect(decryptJson(`${Buffer.alloc(5).toString('base64')}:${tag}:${data}`)).toBeNull();
    });

    it('renvoie null (sans lever) si le authTag a été altéré — détection d\'altération', () => {
      const [iv, , data] = encryptJson(answers).split(':');
      const forgedTag = Buffer.alloc(16, 0xff).toString('base64');
      expect(decryptJson(`${iv}:${forgedTag}:${data}`)).toBeNull();
    });

    it('renvoie null si le ciphertext a été altéré', () => {
      const [iv, tag, data] = encryptJson(answers).split(':');
      const tampered = Buffer.from(data, 'base64');
      tampered[0] ^= 0xff;
      expect(decryptJson(`${iv}:${tag}:${tampered.toString('base64')}`)).toBeNull();
    });
  });
});
