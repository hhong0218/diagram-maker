const Templates = {
  flowchart: [
    {
      id: 'approval',
      name: '업무 승인 프로세스',
      nodes: [
        { type: 'rounded', text: '시작', x: 100, y: 50, width: 120, height: 50, fillColor: '#2b6cb0', strokeColor: '#63b3ed' },
        { type: 'rectangle', text: '신청서 작성', x: 100, y: 150, width: 120, height: 50, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'rectangle', text: '검토', x: 100, y: 250, width: 120, height: 50, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'diamond', text: '승인?', x: 85, y: 350, width: 150, height: 80, fillColor: '#744210', strokeColor: '#ed8936' },
        { type: 'rectangle', text: '승인 처리', x: -50, y: 480, width: 120, height: 50, fillColor: '#22543d', strokeColor: '#48bb78' },
        { type: 'rectangle', text: '반려 통보', x: 250, y: 480, width: 120, height: 50, fillColor: '#742a2a', strokeColor: '#fc8181' },
        { type: 'rounded', text: '종료', x: 100, y: 580, width: 120, height: 50, fillColor: '#2b6cb0', strokeColor: '#63b3ed' }
      ],
      connections: [
        [0, 1], [1, 2], [2, 3], [3, 4, '예'], [3, 5, '아니오'], [4, 6], [5, 6]
      ]
    },
    {
      id: 'decision',
      name: '의사결정 트리',
      nodes: [
        { type: 'rounded', text: '시작', x: 200, y: 30, width: 100, height: 45, fillColor: '#2b6cb0', strokeColor: '#63b3ed' },
        { type: 'diamond', text: '조건 A?', x: 175, y: 120, width: 150, height: 70, fillColor: '#744210', strokeColor: '#ed8936' },
        { type: 'diamond', text: '조건 B?', x: 30, y: 250, width: 150, height: 70, fillColor: '#744210', strokeColor: '#ed8936' },
        { type: 'diamond', text: '조건 C?', x: 350, y: 250, width: 150, height: 70, fillColor: '#744210', strokeColor: '#ed8936' },
        { type: 'rectangle', text: '결과 1', x: 30, y: 380, width: 100, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'rectangle', text: '결과 2', x: 200, y: 380, width: 100, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'rectangle', text: '결과 3', x: 370, y: 380, width: 100, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' }
      ],
      connections: [[0, 1], [1, 2, '예'], [1, 3, '아니오'], [2, 4], [2, 5], [3, 6]]
    },
    {
      id: 'onboarding',
      name: '온보딩 프로세스',
      nodes: [
        { type: 'rounded', text: '입사', x: 150, y: 30, width: 100, height: 45, fillColor: '#2b6cb0', strokeColor: '#63b3ed' },
        { type: 'rectangle', text: '서류 제출', x: 140, y: 120, width: 120, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'rectangle', text: '계정 생성', x: 140, y: 210, width: 120, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'rectangle', text: '교육 이수', x: 140, y: 300, width: 120, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'parallelogram', text: '멘토 배정', x: 130, y: 390, width: 140, height: 45, fillColor: '#2c5282', strokeColor: '#63b3ed' },
        { type: 'document', text: '온보딩 완료', x: 140, y: 480, width: 120, height: 55, fillColor: '#22543d', strokeColor: '#48bb78' }
      ],
      connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]]
    },
    {
      id: 'sdlc',
      name: 'SW 개발 사이클',
      nodes: [
        { type: 'rounded', text: '시작', x: 160, y: 30, width: 100, height: 45, fillColor: '#2b6cb0', strokeColor: '#63b3ed' },
        { type: 'rectangle', text: '기획', x: 150, y: 120, width: 120, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'rectangle', text: '개발', x: 150, y: 210, width: 120, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'rectangle', text: '테스트', x: 150, y: 300, width: 120, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'diamond', text: '버그?', x: 135, y: 390, width: 150, height: 70, fillColor: '#744210', strokeColor: '#ed8936' },
        { type: 'rectangle', text: '배포', x: 150, y: 510, width: 120, height: 45, fillColor: '#22543d', strokeColor: '#48bb78' },
        { type: 'rounded', text: '완료', x: 160, y: 600, width: 100, height: 45, fillColor: '#2b6cb0', strokeColor: '#63b3ed' }
      ],
      connections: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 2, '예'], [4, 5, '아니오'], [5, 6]]
    },
    {
      id: 'customer',
      name: '고객 응대 프로세스',
      nodes: [
        { type: 'rounded', text: '문의 접수', x: 150, y: 30, width: 120, height: 45, fillColor: '#2b6cb0', strokeColor: '#63b3ed' },
        { type: 'parallelogram', text: '문의 내용 확인', x: 140, y: 120, width: 140, height: 45, fillColor: '#2c5282', strokeColor: '#63b3ed' },
        { type: 'diamond', text: '유형 분류', x: 135, y: 210, width: 150, height: 70, fillColor: '#744210', strokeColor: '#ed8936' },
        { type: 'rectangle', text: '기술 지원', x: 20, y: 340, width: 110, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'rectangle', text: '일반 문의', x: 200, y: 340, width: 110, height: 45, fillColor: '#2d3748', strokeColor: '#a0aec0' },
        { type: 'rectangle', text: '처리 완료', x: 150, y: 440, width: 120, height: 45, fillColor: '#22543d', strokeColor: '#48bb78' },
        { type: 'document', text: '고객 피드백', x: 145, y: 530, width: 130, height: 55, fillColor: '#2d3748', strokeColor: '#a0aec0' }
      ],
      connections: [[0, 1], [1, 2], [2, 3, '기술'], [2, 4, '일반'], [3, 5], [4, 5], [5, 6]]
    }
  ],

  mindmap: [
    {
      id: 'project',
      name: '프로젝트 기획',
      center: '프로젝트 기획',
      children: [
        { text: '목표', children: ['KPI 설정', '마일스톤'] },
        { text: '일정', children: ['1분기', '2분기'] },
        { text: '팀', children: ['개발', '디자인', '기획'] },
        { text: '예산', children: ['인건비', '인프라'] },
        { text: '리스크', children: ['일정 지연', '기술 리스크'] }
      ]
    },
    {
      id: 'brainstorm',
      name: '아이디어 브레인스토밍',
      center: '새 아이디어',
      children: [
        { text: '기술', children: ['AI', '클라우드'] },
        { text: '시장', children: ['B2B', 'B2C'] },
        { text: '사용자', children: ['니즈', '페인포인트'] },
        { text: '수익', children: ['구독', '광고'] }
      ]
    },
    {
      id: 'swot',
      name: 'SWOT 분석',
      center: 'SWOT 분석',
      children: [
        { text: '강점 (S)', children: ['기술력', '브랜드'] },
        { text: '약점 (W)', children: ['자금', '인력'] },
        { text: '기회 (O)', children: ['시장 성장', '정책'] },
        { text: '위협 (T)', children: ['경쟁', '규제'] }
      ]
    },
    {
      id: 'study',
      name: '학습 계획',
      center: '학습 계획',
      children: [
        { text: '과목', children: ['수학', '영어', '과학'] },
        { text: '단원', children: ['기초', '심화'] },
        { text: '방법', children: ['강의', '문제풀이', '복습'] },
        { text: '목표', children: ['시험 대비', '자격증'] }
      ]
    },
    {
      id: 'blank',
      name: '빈 마인드맵',
      center: '중심 주제',
      children: []
    }
  ],

  buildFlowchart(tpl) {
    const nodes = tpl.nodes.map(n => ({
      id: Utils.uid(),
      type: n.type,
      x: n.x, y: n.y,
      width: n.width, height: n.height,
      text: n.text,
      fillColor: n.fillColor || '#2d3748',
      strokeColor: n.strokeColor || '#a0aec0',
      level: 0, parentId: null
    }));
    const connections = tpl.connections.map(([fi, ti, label]) => {
      const from = nodes[fi];
      const to = nodes[ti];
      return {
        id: Utils.uid(),
        fromId: from.id, toId: to.id,
        fromSide: 'bottom', toSide: 'top',
        type: 'orthogonal', arrowStart: false, arrowEnd: true,
        color: '#a0aec0', label: label || ''
      };
    });
    return { nodes, connections };
  },

  buildMindmap(tpl) {
    const nodes = [];
    const connections = [];
    const centerId = Utils.uid();
    const centerSize = Utils.measureText(tpl.center, 15);
    nodes.push({
      id: centerId, type: 'mindmap', x: 0, y: 0,
      width: Math.max(centerSize.width, 140), height: Math.max(centerSize.height, 50),
      text: tpl.center, fillColor: Utils.MINDMAP_COLORS[0], strokeColor: Utils.MINDMAP_COLORS[0],
      level: 0, parentId: null, isCenter: true
    });

    const addBranch = (parentId, parentLevel, child, side, index, total) => {
      const id = Utils.uid();
      const level = parentLevel + 1;
      const size = Utils.measureText(child.text, 13);
      const spread = (index - (total - 1) / 2) * 80;
      const xOff = side === 'right' ? 220 : -220;
      const parent = nodes.find(n => n.id === parentId);
      nodes.push({
        id, type: 'mindmap',
        x: parent.x + xOff - size.width / 2,
        y: parent.y + spread,
        width: Math.max(size.width, 80), height: Math.max(size.height, 36),
        text: child.text,
        fillColor: Utils.MINDMAP_COLORS[level % Utils.MINDMAP_COLORS.length],
        strokeColor: Utils.MINDMAP_COLORS[level % Utils.MINDMAP_COLORS.length],
        level, parentId, side
      });
      connections.push({
        id: Utils.uid(), fromId: parentId, toId: id,
        fromSide: side === 'right' ? 'right' : 'left',
        toSide: side === 'right' ? 'left' : 'right',
        type: 'curved', arrowStart: false, arrowEnd: false,
        color: Utils.MINDMAP_COLORS[level % Utils.MINDMAP_COLORS.length], label: ''
      });
      if (child.children) {
        child.children.forEach((gc, gi) => addBranch(id, level, { text: gc }, side, gi, child.children.length));
      }
    };

    const leftCount = Math.ceil(tpl.children.length / 2);
    tpl.children.forEach((child, i) => {
      const side = i < leftCount ? 'left' : 'right';
      const sideIndex = side === 'left' ? i : i - leftCount;
      const sideTotal = side === 'left' ? leftCount : tpl.children.length - leftCount;
      addBranch(centerId, 0, child, side, sideIndex, sideTotal);
    });

    return { nodes, connections };
  }
};