(function () {
  'use strict';

  const STORAGE_EMPLOYES = 'kaboucaria_employes';
  const STORAGE_PRESENCE = 'kaboucaria_presence';

  /** Retenue fixe par jour d'absence pour tous les employés (GNF) */
  const RETENUE_PAR_ABSENCE_GNF = 30000;

  const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];

  function getEmployes() {
    const raw = localStorage.getItem(STORAGE_EMPLOYES);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return arr.map(emp => ({
        ...emp,
        salaire: typeof emp.salaire === 'number' ? emp.salaire : (parseFloat(emp.salaire) || 0),
        telephone: emp.telephone != null ? String(emp.telephone) : ''
      }));
    } catch (_) {
      return [];
    }
  }

  function setEmployes(arr) {
    localStorage.setItem(STORAGE_EMPLOYES, JSON.stringify(arr));
  }

  function getPresence() {
    const raw = localStorage.getItem(STORAGE_PRESENCE);
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch (_) {
      return {};
    }
  }

  function setPresence(obj) {
    localStorage.setItem(STORAGE_PRESENCE, JSON.stringify(obj));
  }

  function getDaysInMonth(year, month) {
    return new Date(year, month, 0).getDate();
  }

  /** 0=Dimanche, 1=Lundi, ..., 5=Vendredi, 6=Samedi */
  function getDayOfWeek(year, month, day) {
    return new Date(year, month - 1, day).getDay();
  }

  function isVendredi(year, month, day) {
    return getDayOfWeek(year, month, day) === 5;
  }

  function isWeekend(year, month, day) {
    const d = getDayOfWeek(year, month, day);
    return d === 0 || d === 6;
  }

  function getDefaultStatus(year, month, day) {
    if (isVendredi(year, month, day)) return 'R';
    if (isWeekend(year, month, day)) return 'WE';
    return 'P';
  }

  function getJoursOuvrablesCount(year, month) {
    const days = getDaysInMonth(year, month);
    let count = 0;
    for (let d = 1; d <= days; d++) {
      if (!isVendredi(year, month, d) && !isWeekend(year, month, d)) count++;
    }
    return count;
  }

  function getPresenceKey(year, month) {
    return `${year}-${String(month).padStart(2, '0')}`;
  }

  function getPresenceForMonth(employeeId, year, month) {
    const all = getPresence();
    const key = getPresenceKey(year, month);
    if (!all[key]) return {};
    return all[key][employeeId] || {};
  }

  function setPresenceDay(employeeId, year, month, day, data) {
    if (isVendredi(year, month, day)) {
      data = { status: 'R', arrivee: '', depart: '' };
    }
    const all = getPresence();
    const key = getPresenceKey(year, month);
    if (!all[key]) all[key] = {};
    if (!all[key][employeeId]) all[key][employeeId] = {};
    all[key][employeeId][String(day)] = data;
    setPresence(all);
  }

  function getPresenceDay(employeeId, year, month, day) {
    if (isVendredi(year, month, day)) {
      return { status: 'R', arrivee: '', depart: '' };
    }
    const monthData = getPresenceForMonth(employeeId, year, month);
    const dayStr = String(day);
    if (monthData[dayStr]) return monthData[dayStr];
    const status = getDefaultStatus(year, month, day);
    return { status, arrivee: status === 'P' ? '08:00' : '', depart: status === 'P' ? '17:00' : '' };
  }

  function computeStats(employeeId, year, month) {
    const days = getDaysInMonth(year, month);
    let presence = 0, absence = 0, conge = 0;
    const joursOuvrables = getJoursOuvrablesCount(year, month);

    for (let d = 1; d <= days; d++) {
      if (isVendredi(year, month, d)) continue;
      const data = getPresenceDay(employeeId, year, month, d);
      const status = data.status || getDefaultStatus(year, month, d);

      if (status === 'R' || status === 'WE') continue;
      if (status === 'P') presence++;
      else if (status === 'A') absence++;
      else if (status === 'C') conge++;
    }

    const taux = joursOuvrables > 0 ? Math.round((absence / joursOuvrables) * 100) : 0;
    return { presence, absence, conge, taux, joursOuvrables };
  }

  /** Retenue totale pour les absences du mois (30 000 GNF par jour d'absence) */
  function computeRetenueAbsences(employeeId, year, month) {
    const stats = computeStats(employeeId, year, month);
    return stats.absence * RETENUE_PAR_ABSENCE_GNF;
  }

  function computeSalaireAPayer(emp, year, month) {
    const salaire = Number(emp.salaire) || 0;
    if (salaire <= 0) return 0;
    const retenue = computeRetenueAbsences(emp.id, year, month);
    return Math.max(0, salaire - retenue);
  }

  function formatSalaire(n) {
    return Number(n).toLocaleString('fr-FR');
  }

  function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
  }

  function initSampleData() {
    if (getEmployes().length > 0) return;
    const sample = [
      { id: generateId(), nomComplet: 'Daniel TOUNKARA', service: 'Orange Money', salaire: 0, telephone: '' },
      { id: generateId(), nomComplet: 'Karifala KABA', service: 'Grossiste Pharmacy', salaire: 0, telephone: '' },
      { id: generateId(), nomComplet: 'Sansi KABA', service: 'Directeur Général', salaire: 0, telephone: '' },
      { id: generateId(), nomComplet: 'Mamadou DIALLO', service: 'Cosmétique', salaire: 0, telephone: '' },
      { id: generateId(), nomComplet: 'Aissatou BAH', service: 'Stock', salaire: 0, telephone: '' },
      { id: generateId(), nomComplet: 'Ibrahima SOW', service: 'Pharmacopie', salaire: 0, telephone: '' }
    ];
    setEmployes(sample);
  }

  initSampleData();

  function showPage(pageId) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    const page = document.getElementById('page-' + pageId);
    const btn = document.querySelector('.nav-btn[data-page="' + pageId + '"]');
    if (page) page.classList.add('active');
    if (btn) btn.classList.add('active');

    if (pageId === 'dashboard') renderDashboard();
    if (pageId === 'fiche') renderFiche();
    if (pageId === 'paiement') renderPaiement();
    if (pageId === 'employes') renderEmployes();
  }

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', function () {
      showPage(this.getAttribute('data-page'));
    });
  });

  function renderDashboard() {
    const employes = getEmployes();
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const today = now.getDate();

    let totalPresents = 0;
    let totalAbsences = 0;
    let totalTaux = 0;

    const rows = employes.map(emp => {
      const stats = computeStats(emp.id, year, month);
      const dayData = getPresenceDay(emp.id, year, month, today);
      if (dayData.status === 'P') totalPresents++;
      totalAbsences += stats.absence;
      totalTaux += stats.taux;

      return `
        <tr>
          <td>${escapeHtml(emp.nomComplet)}</td>
          <td>${escapeHtml(emp.service)}</td>
          <td>${stats.presence}</td>
          <td>${stats.absence}</td>
          <td>${stats.conge}</td>
          <td>
            <span>${stats.taux}%</span>
            <div class="taux-bar"><div class="taux-bar-fill" style="width:${Math.min(stats.taux, 100)}%"></div></div>
          </td>
        </tr>
      `;
    });

    document.getElementById('stat-total').textContent = employes.length;
    document.getElementById('stat-presents').textContent = totalPresents;
    document.getElementById('stat-absences').textContent = totalAbsences;
    document.getElementById('stat-taux').textContent = employes.length ? Math.round(totalTaux / employes.length) + '%' : '0%';
    document.getElementById('dashboard-tbody').innerHTML = rows.join('');

    drawDashboardCharts(year, month);
  }

  function drawDashboardCharts(year, month) {
    const employes = getEmployes();
    const days = getDaysInMonth(year, month);
    const presenceParJour = [];
    for (let d = 1; d <= days; d++) {
      let count = 0;
      employes.forEach(emp => {
        const data = getPresenceDay(emp.id, year, month, d);
        if (data.status === 'P') count++;
      });
      presenceParJour.push(count);
    }

    const canvasJours = document.getElementById('chart-presence-jours');
    if (canvasJours) {
      const ctx = canvasJours.getContext('2d');
      const w = canvasJours.width;
      const h = canvasJours.height;
      ctx.clearRect(0, 0, w, h);
      const max = Math.max(1, ...presenceParJour);
      const barW = (w - 40) / days - 2;
      const gap = 2;
      for (let i = 0; i < presenceParJour.length; i++) {
        const barH = (presenceParJour[i] / max) * (h - 30);
        const x = 20 + i * (barW + gap);
        const y = h - 20 - barH;
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#2ea043';
        ctx.fillRect(x, y, barW, barH);
      }
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-muted').trim() || '#8b949e';
      ctx.font = '11px Plus Jakarta Sans';
      ctx.fillText('Jours du mois →', 20, h - 5);
    }

    let pCount = 0, aCount = 0, cCount = 0, weCount = 0, rCount = 0;
    employes.forEach(emp => {
      for (let d = 1; d <= days; d++) {
        const data = getPresenceDay(emp.id, year, month, d);
        const s = data.status || getDefaultStatus(year, month, d);
        if (s === 'P') pCount++;
        else if (s === 'A') aCount++;
        else if (s === 'C') cCount++;
        else if (s === 'WE') weCount++;
        else if (s === 'R') rCount++;
      }
    });

    const canvasRep = document.getElementById('chart-repartition');
    if (canvasRep) {
      const ctx = canvasRep.getContext('2d');
      const total = pCount + aCount + cCount + weCount + rCount || 1;
      const colors = ['#2ea043', '#f85149', '#d29922', '#8b949e', '#484f58'];
      const values = [pCount, aCount, cCount, weCount, rCount];
      const labels = ['Présence', 'Absence', 'Congé', 'WE', 'Repos'];
      let start = 0;
      const cx = canvasRep.width / 2;
      const cy = canvasRep.height / 2 - 10;
      const radius = Math.min(cx, cy) - 10;
      values.forEach((v, i) => {
        if (v <= 0) return;
        const slice = (v / total) * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, start + slice);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();
        start += slice;
      });
      ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text').trim() || '#e6edf3';
      ctx.font = '10px Plus Jakarta Sans';
      ctx.textAlign = 'center';
      values.forEach((v, i) => {
        if (v > 0) ctx.fillText(labels[i] + ' ' + v, cx, 15 + i * 14);
      });
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderFiche() {
    const moisInput = document.getElementById('fiche-mois');
    const now = new Date();
    if (!moisInput.value) {
      moisInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const [year, month] = moisInput.value.split('-').map(Number);
    const days = getDaysInMonth(year, month);

    document.getElementById('fiche-mois-titre').textContent = MOIS_NOMS[month - 1] + ' ' + year;

    const theadDays = document.getElementById('fiche-thead-days');
    const existingJours = theadDays.querySelectorAll('.col-jour');
    existingJours.forEach(el => el.remove());
    for (let d = 1; d <= days; d++) {
      const th = document.createElement('th');
      th.className = 'col-jour';
          th.textContent = String(d).padStart(2, '0');
      theadDays.appendChild(th);
    }

    const employes = getEmployes();
    const tbody = document.getElementById('fiche-tbody');
    tbody.innerHTML = '';

    employes.forEach(emp => {
      const stats = computeStats(emp.id, year, month);
      const salaireAPayer = computeSalaireAPayer(emp, year, month);
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="col-nom sticky">${escapeHtml(emp.nomComplet)}</td>
        <td class="col-service sticky">${escapeHtml(emp.service)}</td>
        <td class="col-presence">${stats.presence}</td>
        <td class="col-absence">${stats.absence}</td>
        <td class="col-conge">${stats.conge}</td>
        <td class="col-taux">
          <span>${stats.taux}%</span>
          <div class="taux-bar"><div class="taux-bar-fill" style="width:${Math.min(stats.taux, 100)}%"></div></div>
        </td>
        <td class="col-salaire-paye">${formatSalaire(salaireAPayer)}</td>
      `;
      for (let d = 1; d <= days; d++) {
        const data = getPresenceDay(emp.id, year, month, d);
        const status = data.status || getDefaultStatus(year, month, d);
        const td = document.createElement('td');
        td.className = 'col-jour';
        const cell = document.createElement('div');
        cell.className = 'cell-jour status-' + status;
        cell.textContent = status;
        if (data.arrivee && data.depart && status === 'P') {
          const hours = document.createElement('span');
          hours.className = 'cell-hours';
          hours.textContent = data.arrivee + ' - ' + data.depart;
          cell.appendChild(hours);
        }
        cell.addEventListener('click', () => openModalJour(emp.id, year, month, d, data, cell));
        td.appendChild(cell);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    });
  }

  document.getElementById('fiche-mois').addEventListener('change', renderFiche);

  function renderPaiement() {
    const moisInput = document.getElementById('paiement-mois');
    const now = new Date();
    if (!moisInput.value) {
      moisInput.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    }
    const [year, month] = moisInput.value.split('-').map(Number);
    document.getElementById('paiement-mois-titre').textContent = '– ' + MOIS_NOMS[month - 1] + ' ' + year;

    const employes = getEmployes();
    const tbody = document.getElementById('paiement-tbody');
    const tfoot = document.getElementById('paiement-tfoot');
    let totalRetenue = 0;
    let totalSalaireAPayer = 0;

    tbody.innerHTML = employes.map(emp => {
      const stats = computeStats(emp.id, year, month);
      const salaireMensuel = Number(emp.salaire) || 0;
      const salaireAPayer = computeSalaireAPayer(emp, year, month);
      const retenue = salaireMensuel - salaireAPayer;
      totalRetenue += retenue;
      totalSalaireAPayer += salaireAPayer;

      return `
        <tr>
          <td>${escapeHtml(emp.nomComplet)}</td>
          <td>${escapeHtml(emp.service)}</td>
          <td>${stats.joursOuvrables}</td>
          <td>${stats.presence}</td>
          <td>${stats.absence}</td>
          <td>${stats.conge}</td>
          <td>${formatSalaire(salaireMensuel)}</td>
          <td class="retenue">${formatSalaire(retenue)}</td>
          <td class="salaire-paye">${formatSalaire(salaireAPayer)}</td>
          <td><button type="button" class="btn btn-primary btn-sm btn-bulletin-pdf" data-emp-id="${escapeHtml(emp.id)}">PDF</button></td>
        </tr>
      `;
    }).join('');

    tfoot.innerHTML = `
      <tr class="total-row">
        <td colspan="6"><strong>Total</strong></td>
        <td>—</td>
        <td class="retenue"><strong>${formatSalaire(totalRetenue)}</strong></td>
        <td class="salaire-paye"><strong>${formatSalaire(totalSalaireAPayer)}</strong></td>
        <td></td>
      </tr>
    `;

    document.getElementById('paiement-tbody').querySelectorAll('.btn-bulletin-pdf').forEach(btn => {
      btn.addEventListener('click', function () {
        const empId = this.getAttribute('data-emp-id');
        const emp = getEmployes().find(e => e.id === empId);
        if (emp) generateBulletinPDF(emp, year, month);
      });
    });
  }

  function generateBulletinPDF(emp, year, month) {
    if (typeof window.jspdf === 'undefined') {
      alert('Bibliothèque PDF non chargée. Vérifiez votre connexion.');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageW = 210;
    const pageH = 297;
    const margin = 14;
    const contentW = pageW - margin * 2;
    const lineH = 6;
    const boxPad = 5;

    const stats = computeStats(emp.id, year, month);
    const salaireMensuel = Number(emp.salaire) || 0;
    const salaireAPayer = computeSalaireAPayer(emp, year, month);
    const retenue = salaireMensuel - salaireAPayer;
    const moisLibelle = MOIS_NOMS[month - 1] + ' ' + year;
    const dateEdition = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    function drawBox(x, y, w, h, title, fillHeader) {
      doc.setDrawColor(60, 60, 60);
      doc.setLineWidth(0.4);
      doc.rect(x, y, w, h);
      if (title) {
        doc.setFillColor(26, 61, 50);
        doc.rect(x, y, w, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont(undefined, 'bold');
        doc.text(title, x + boxPad, y + 5.5);
        doc.setTextColor(0, 0, 0);
        doc.setFont(undefined, 'normal');
      }
    }

    let y = margin;

    // —— Encadrement principal de la page ——
    doc.setDrawColor(40, 40, 40);
    doc.setLineWidth(0.8);
    doc.rect(margin, margin, contentW, pageH - margin * 2);

    // —— En-tête : Etablissements Kaboucaria et Fils (référence capture) ——
    const headerH = 38;
    doc.setDrawColor(80, 80, 80);
    doc.setLineWidth(0.3);
    doc.rect(margin + 2, y + 2, contentW - 4, headerH);
    doc.setFillColor(248, 248, 248);
    doc.rect(margin + 2, y + 2, contentW - 4, headerH, 'F');
    doc.setDrawColor(180, 180, 180);
    doc.rect(margin + 2, y + 2, contentW - 4, headerH);

    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.setFont(undefined, 'normal');
    doc.text('Nom :', margin + 6, y);
    doc.setFont(undefined, 'bold');
    doc.text('ETABLISSEMENTS KABOUKARIA ET FILS', margin + 22, y);
    doc.setFont(undefined, 'normal');
    doc.setDrawColor(100, 100, 100);
    doc.line(margin + 6, y + 1.5, margin + contentW - 10, y + 1.5);
    y += 7;
    doc.text('Adresse :', margin + 6, y);
    doc.text('SIGUIRI CENTRE SIGUIRIKOURA II', margin + 28, y);
    y += 6;
    doc.text('NIF :', margin + 6, y);
    doc.text('661 827 782', margin + 18, y);
    doc.text('Clé TVA :', margin + 55, y);
    doc.setFont(undefined, 'bold');
    doc.text('9C', margin + 72, y);
    doc.setFont(undefined, 'normal');
    y += 6;
    doc.text('RCCM :', margin + 6, y);
    doc.text('GN.TCC.2023.A.00518', margin + 22, y);
    y += 6;
    doc.text('TEL :', margin + 6, y);
    doc.text('628 559 934', margin + 18, y);
    doc.setTextColor(0, 0, 0);
    y += 12;

    // —— Bandeau BULLETIN DE SALAIRE ——
    doc.setFillColor(26, 61, 50);
    doc.rect(margin + 2, y, contentW - 4, 12, 'F');
    doc.setDrawColor(46, 160, 67);
    doc.setLineWidth(0.5);
    doc.rect(margin + 2, y, contentW - 4, 12);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    var titreW = (doc.getTextDimensions && doc.getTextDimensions('BULLETIN DE SALAIRE').w) || 55;
    doc.text('BULLETIN DE SALAIRE', margin + (contentW - 4) / 2 - titreW / 2, y + 8.5);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);
    y += 16;

    // —— Période et date d'édition ——
    drawBox(margin + 2, y, contentW - 4, 18, null);
    y += 6;
    doc.setFontSize(10);
    doc.text('Période : ' + moisLibelle, margin + 8, y);
    doc.text('Date d\'édition : ' + dateEdition, margin + contentW / 2, y);
    y += 14;

    // —— Encadré Employé ——
    const empBoxH = 22;
    drawBox(margin + 2, y, contentW - 4, empBoxH, '  Employé', true);
    y += 10;
    doc.setFontSize(8); 
    doc.text('Nom : ' + emp.nomComplet, margin + 8, y);
    y += lineH;
    doc.text('Service : ' + (emp.service || '—'), margin + 8, y);
    y += empBoxH - 16 + 4;

    // —— Encadré Détail du mois ——
    const detailH = 38;
    drawBox(margin + 2, y, contentW - 4, detailH, '  Détail du mois', true);
    y += 10;
    doc.setFontSize(9);
    doc.text('Jours ouvrés (hors vendredis et week-ends) : ' + stats.joursOuvrables, margin + 8, y);
    y += lineH;
    doc.text('Jours de présence : ' + stats.presence, margin + 8, y);
    y += lineH;
    doc.text('Jours d\'absence : ' + stats.absence + '  (retenue 30 000 GNF / jour d\'absence)', margin + 8, y);
    y += lineH;
    doc.text('Jours de congé : ' + stats.conge, margin + 8, y);
    y += detailH - 28 + 4;

    // —— Encadré Récapitulatif salaire ——
    const recapH = 38;
    drawBox(margin + 2, y, contentW - 4, recapH, '  Récapitulatif salaire', true);
    y += 10;
    doc.setFontSize(10);
    doc.text('Salaire mensuel brut ............................ ' + formatSalaire(salaireMensuel) + ' GNF', margin + 4, y);
    y += lineH + 2;
    doc.setTextColor(180, 50, 50);
    doc.text('Retenue (absences) ............................. - ' + formatSalaire(retenue) + ' GNF', margin + 6, y);
    doc.setTextColor(0, 0, 0);
    y += lineH + 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin + 8, y - 2, margin + contentW - 12, y - 2);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(26, 61, 50);
    doc.text('SALAIRE NET À PAYER ......................... ' + formatSalaire(salaireAPayer) + ' GNF', margin + 8, y + 4);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    y += recapH - 22 + 6;

    // —— Pied de page ——
    y = pageH - margin - 18;
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);
    doc.line(margin + 8, y - 4, margin + contentW - 8, y - 4);
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text('Document généré automatiquement — Gestion de Présence KABOUCARIA 2026.', margin + 8, y + 2);
    doc.text('Les vendredis sont des jours de repos et ne sont pas comptés comme jours ouvrés.', margin + 8, y + 7);
    doc.setTextColor(0, 0, 0);

    const fileName = 'Bulletin_' + (emp.nomComplet || 'Employe').replace(/\s+/g, '_') + '_' + moisLibelle.replace(/\s+/g, '_') + '.pdf';
    doc.save(fileName);
  }

  document.getElementById('btn-generer-tous-bulletins').addEventListener('click', function () {
    const moisInput = document.getElementById('paiement-mois');
    if (!moisInput.value) return;
    const [year, month] = moisInput.value.split('-').map(Number);
    const employes = getEmployes();
    if (employes.length === 0) {
      alert('Aucun employé.');
      return;
    }
    employes.forEach((emp, i) => {
      setTimeout(function () {
        generateBulletinPDF(emp, year, month);
      }, i * 600);
    });
  });

  document.getElementById('paiement-mois').addEventListener('change', renderPaiement);

  let modalContext = null;

  function openModalJour(employeeId, year, month, day, data, cellRef) {
    modalContext = { employeeId, year, month, day, cellRef };
    document.getElementById('modal-jour-num').textContent = day;
    const isVendrediJour = isVendredi(year, month, day);
    const statutSelect = document.getElementById('modal-statut');
    statutSelect.value = isVendrediJour ? 'R' : (data.status || getDefaultStatus(year, month, day));
    statutSelect.disabled = isVendrediJour;
    document.getElementById('modal-arrivee').value = isVendrediJour ? '' : (data.arrivee || '');
    document.getElementById('modal-depart').value = isVendrediJour ? '' : (data.depart || '');
    document.getElementById('modal-arrivee').disabled = isVendrediJour;
    document.getElementById('modal-depart').disabled = isVendrediJour;
    document.getElementById('modal-jour').classList.remove('hidden');
  }

  document.getElementById('modal-save').addEventListener('click', function () {
    if (!modalContext) return;
    const { employeeId, year, month, day } = modalContext;
    if (isVendredi(year, month, day)) {
      setPresenceDay(employeeId, year, month, day, { status: 'R', arrivee: '', depart: '' });
    } else {
      const status = document.getElementById('modal-statut').value;
      const arrivee = document.getElementById('modal-arrivee').value;
      const depart = document.getElementById('modal-depart').value;
      setPresenceDay(employeeId, year, month, day, { status, arrivee, depart });
    }
    renderFiche();
    closeModalJour();
  });

  function closeModalJour() {
    document.getElementById('modal-jour').classList.add('hidden');
    document.getElementById('modal-statut').disabled = false;
    document.getElementById('modal-arrivee').disabled = false;
    document.getElementById('modal-depart').disabled = false;
    modalContext = null;
  }

  document.getElementById('modal-close').addEventListener('click', closeModalJour);

  document.getElementById('modal-jour').addEventListener('click', function (e) {
    if (e.target === this) closeModalJour();
  });

  function renderEmployes() {
    const employes = getEmployes();
    const tbody = document.getElementById('employes-tbody');
    tbody.innerHTML = employes.map(emp => `
      <tr>
        <td>${escapeHtml(emp.nomComplet)}</td>
        <td>${escapeHtml(emp.service)}</td>
        <td>${formatSalaire(emp.salaire || 0)}</td>
        <td>${escapeHtml(emp.telephone || '')}</td>
        <td>
          <button type="button" class="btn btn-edit btn-sm" data-edit="${escapeHtml(emp.id)}">Modifier</button>
          <button type="button" class="btn btn-danger btn-sm" data-delete="${escapeHtml(emp.id)}">Supprimer</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('[data-edit]').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-edit');
        openEditEmployeModal(id);
      });
    });

    tbody.querySelectorAll('[data-delete]').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.getAttribute('data-delete');
        if (confirm('Supprimer cet employé ?')) {
          setEmployes(getEmployes().filter(e => e.id !== id));
          renderEmployes();
          renderDashboard();
        }
      });
    });
  }

  function openEditEmployeModal(employeeId) {
    const emp = getEmployes().find(e => e.id === employeeId);
    if (!emp) return;
    document.getElementById('edit-employe-id').value = emp.id;
    document.getElementById('edit-nom').value = emp.nomComplet || '';
    document.getElementById('edit-service').value = emp.service || '';
    document.getElementById('edit-salaire').value = emp.salaire || '';
    document.getElementById('edit-telephone').value = emp.telephone || '';
    document.getElementById('edit-form-message').textContent = '';
    document.getElementById('modal-edit-employe').classList.remove('hidden');
  }

  document.getElementById('edit-employe-save').addEventListener('click', function () {
    const id = document.getElementById('edit-employe-id').value;
    const nom = document.getElementById('edit-nom').value.trim();
    const service = document.getElementById('edit-service').value.trim();
    const salaire = parseFloat(document.getElementById('edit-salaire').value) || 0;
    const telephone = document.getElementById('edit-telephone').value.trim();
    const msg = document.getElementById('edit-form-message');
    if (!nom || !service) {
      msg.textContent = 'Veuillez remplir le nom et le service.';
      msg.className = 'form-message error';
      return;
    }
    const employes = getEmployes();
    const index = employes.findIndex(e => e.id === id);
    if (index === -1) {
      msg.textContent = 'Employé introuvable.';
      msg.className = 'form-message error';
      return;
    }
    employes[index] = {
      ...employes[index],
      nomComplet: nom,
      service: service,
      salaire: salaire,
      telephone: telephone
    };
    setEmployes(employes);
    document.getElementById('modal-edit-employe').classList.add('hidden');
    renderEmployes();
    renderDashboard();
  });

  document.getElementById('edit-employe-cancel').addEventListener('click', function () {
    document.getElementById('modal-edit-employe').classList.add('hidden');
  });

  document.getElementById('modal-edit-employe').addEventListener('click', function (e) {
    if (e.target === this) this.classList.add('hidden');
  });

  document.getElementById('form-employe').addEventListener('submit', function (e) {
    e.preventDefault();
    const nom = document.getElementById('nom').value.trim();
    const service = document.getElementById('service').value.trim();
    const salaire = parseFloat(document.getElementById('salaire').value) || 0;
    const telephone = document.getElementById('telephone').value.trim();
    const msg = document.getElementById('form-message');
    if (!nom || !service) {
      msg.textContent = 'Veuillez remplir tous les champs obligatoires.';
      msg.className = 'form-message error';
      return;
    }
    const employes = getEmployes();
    employes.push({
      id: generateId(),
      nomComplet: nom,
      service: service,
      salaire: salaire,
      telephone: telephone
    });
    setEmployes(employes);
    document.getElementById('nom').value = '';
    document.getElementById('service').value = '';
    document.getElementById('salaire').value = '';
    document.getElementById('telephone').value = '';
    msg.textContent = 'Employé enregistré avec succès.';
    msg.className = 'form-message success';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  });

  showPage('dashboard');
})();
