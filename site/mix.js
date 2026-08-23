(function(){
  const data = [
    { label: 'The Beam', value: 46, color: '#ff3ea5' },
    { label: 'Fusion', value: 31, color: '#35e0e0' },
    { label: 'Moontide', value: 14, color: '#d8e838' },
    { label: 'Stored light', value: 9, color: '#ff7a1a' }
  ];

  const container = document.getElementById('mixChart');
  if (!container) return;

  const size = 400;
  const cx = size / 2;
  const cy = size / 2;
  const radius = 160;
  const innerRadius = 96;

  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${size} ${size}`);
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', 'Generation mix: The Beam 46%, Fusion 31%, Moontide 14%, Stored light 9%');

  let angle = -Math.PI / 2;
  data.forEach(item => {
    const sliceAngle = (item.value / 100) * Math.PI * 2;
    const endAngle = angle + sliceAngle;

    const x1 = cx + radius * Math.cos(angle);
    const y1 = cy + radius * Math.sin(angle);
    const x2 = cx + radius * Math.cos(endAngle);
    const y2 = cy + radius * Math.sin(endAngle);

    const ix1 = cx + innerRadius * Math.cos(angle);
    const iy1 = cy + innerRadius * Math.sin(angle);
    const ix2 = cx + innerRadius * Math.cos(endAngle);
    const iy2 = cy + innerRadius * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;

    const d = [
      `M ${ix1} ${iy1}`,
      `L ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${ix2} ${iy2}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${ix1} ${iy1}`,
      'Z'
    ].join(' ');

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', d);
    path.setAttribute('fill', item.color);
    svg.appendChild(path);

    // label on slice
    const midAngle = angle + sliceAngle / 2;
    const labelRadius = innerRadius + (radius - innerRadius) / 2;
    const lx = cx + labelRadius * Math.cos(midAngle);
    const ly = cy + labelRadius * Math.sin(midAngle);

    const text = document.createElementNS(ns, 'text');
    text.setAttribute('x', lx);
    text.setAttribute('y', ly);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'middle');
    text.setAttribute('fill', '#16101f');
    text.setAttribute('font-size', '14');
    text.setAttribute('font-weight', '800');
    text.textContent = item.value + '%';
    svg.appendChild(text);

    angle = endAngle;
  });

  container.appendChild(svg);
})();
