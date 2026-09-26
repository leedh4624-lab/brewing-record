    const STORAGE_KEY = "bean-journal-v1";
    const AUTH_USERS_KEY = "bean-journal-users-v1";
    const AUTH_SESSION_KEY = "bean-journal-session-v1";
    const THEME_KEY = "bean-journal-theme-v1";

    const initialData = {
      beans: [],
      recipes: [],
      tastings: []
    };

    let state = loadState();
    let activeView = "beans";
    let editing = { type: null, id: null };

    const forms = {
      beans: document.getElementById("beanForm"),
      recipes: document.getElementById("recipeForm"),
      tastings: document.getElementById("tastingForm")
    };

    const CUP_NOTE_WHEEL = [
      { name: "플로럴", color: "#b07fd0", notes: [["라벤더", "#9b7fd6"], ["자스민", "#d6b4e6"], ["장미", "#e27a9e"], ["캐모마일", "#e3c35a"], ["홍차", "#a8573f"]] },
      { name: "베리", color: "#d9486a", notes: [["딸기", "#e8475f"], ["라즈베리", "#d6336c"], ["블루베리", "#5b6fc4"], ["블랙베리", "#5d3b6e"]] },
      { name: "과일", color: "#f0845f", notes: [["복숭아", "#f7a07a"], ["살구", "#f2a04a"], ["체리", "#c8283f"], ["사과", "#9cc155"], ["포도", "#8a4f9e"], ["건포도", "#7a3f3a"]] },
      { name: "시트러스", color: "#f2a23c", notes: [["귤", "#f59331"], ["오렌지", "#f5a623"], ["레몬", "#eed23a"], ["자몽", "#ee7b62"], ["라임", "#9fc93c"]] },
      { name: "달콤함", color: "#e3ad45", notes: [["꿀", "#e8a93a"], ["캐러멜", "#c98a3a"], ["흑설탕", "#a0673a"], ["메이플시럽", "#b8702e"], ["바닐라", "#ecd49a"]] },
      { name: "너티", color: "#c49468", notes: [["아몬드", "#caa074"], ["헤이즐넛", "#a87b4f"], ["땅콩", "#d6a86a"]] },
      { name: "초콜릿", color: "#7d4e35", notes: [["다크초콜릿", "#5a3526"], ["밀크초콜릿", "#93603f"], ["코코아", "#6e4330"]] },
      { name: "스파이스", color: "#c0653c", notes: [["시나몬", "#b8653a"], ["정향", "#8e4a33"], ["후추", "#6e5a4e"]] },
      { name: "그린", color: "#7fae6a", notes: [["녹차", "#8fb35a"], ["허브", "#5f9e5f"], ["풀", "#86c06a"]] },
      { name: "발효", color: "#a4476a", notes: [["와인", "#8e2f4f"], ["위스키", "#b4743a"]] },
      { name: "로스팅", color: "#8a7a6e", notes: [["곡물", "#c9a978"], ["토스트", "#a88455"], ["스모키", "#6f6660"]] }
    ];

    let cupNotes = [];
    let selectedCupNoteColor = CUP_NOTE_WHEEL[0].color;

    const cupNoteWheel = document.getElementById("cupNoteWheel");
    const cupNoteCustomColor = document.getElementById("cupNoteCustomColor");
    const cupNoteInput = document.getElementById("cupNoteInput");
    const cupNoteList = document.getElementById("cupNoteList");

    const recipeSteps = document.getElementById("recipeSteps");
    const stepsText = document.getElementById("stepsText");
    const stepsPreview = document.getElementById("stepsPreview");

    const formText = {
      beans: {
        title: "원두 정보 추가",
        help: "로스터리, 원산지, 품종, 가공방식, 로스팅 포인트를 저장합니다."
      },
      recipes: {
        title: "레시피 추가",
        help: "드리퍼, 필터, 비율, 분쇄도, 물온도와 추출 단계를 기록합니다."
      },
      tastings: {
        title: "오늘의 커피 추가",
        help: "추출 결과의 맛, 평점, 다음에 바꿀 피드백을 남깁니다."
      },
      all: {
        title: "전체 기록 보기",
        help: "왼쪽 메뉴에서 기록 유형을 선택해 새 항목을 추가할 수 있습니다."
      }
    };

    function loadState() {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
        return saved ? { ...initialData, ...saved } : structuredClone(initialData);
      } catch {
        return structuredClone(initialData);
      }
    }

    function saveState() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function loadUsers() {
      try {
        return JSON.parse(localStorage.getItem(AUTH_USERS_KEY)) || [];
      } catch {
        return [];
      }
    }

    function saveUsers(users) {
      localStorage.setItem(AUTH_USERS_KEY, JSON.stringify(users));
    }

    function getSessionUser() {
      const email = localStorage.getItem(AUTH_SESSION_KEY);
      if (!email) return null;
      return loadUsers().find((user) => user.email === email) || null;
    }

    function setAuthMessage(message, isSuccess = false) {
      const messageBox = document.getElementById("authMessage");
      if (!messageBox) return;
      messageBox.textContent = message;
      messageBox.style.color = isSuccess ? "var(--green)" : "var(--rose)";
    }

    function setAuthMode(mode) {
      document.querySelectorAll("[data-auth-tab]").forEach((button) => {
        button.classList.toggle("active", button.dataset.authTab === mode);
      });
      document.getElementById("loginForm").classList.toggle("hidden", mode !== "login");
      document.getElementById("signupForm").classList.toggle("hidden", mode !== "signup");
      setAuthMessage("");
    }

    function applyAuthState() {
      const user = getSessionUser();
      document.body.classList.toggle("authenticated", Boolean(user));
      const currentUserName = document.getElementById("currentUserName");
      if (currentUserName) {
        currentUserName.textContent = user ? `${user.name}님` : "";
      }
      return user;
    }

    function handleSignup(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const name = data.name.trim();
      const email = data.email.trim().toLowerCase();
      const password = data.password;
      const confirmPassword = data.confirmPassword;

      if (password.length < 6) {
        setAuthMessage("비밀번호는 6자 이상이어야 합니다.");
        return;
      }
      if (password !== confirmPassword) {
        setAuthMessage("비밀번호 확인이 일치하지 않습니다.");
        return;
      }

      const users = loadUsers();
      if (users.some((user) => user.email === email)) {
        setAuthMessage("이미 가입된 이메일입니다.");
        return;
      }

      users.push({ name, email, password, createdAt: new Date().toISOString() });
      saveUsers(users);
      localStorage.setItem(AUTH_SESSION_KEY, email);
      form.reset();
      applyAuthState();
    }

    function handleLogin(event) {
      event.preventDefault();
      const form = event.currentTarget;
      const data = Object.fromEntries(new FormData(form).entries());
      const email = data.email.trim().toLowerCase();
      const user = loadUsers().find((entry) => entry.email === email && entry.password === data.password);

      if (!user) {
        setAuthMessage("이메일 또는 비밀번호를 확인해 주세요.");
        return;
      }

      localStorage.setItem(AUTH_SESSION_KEY, user.email);
      form.reset();
      applyAuthState();
    }

    function handleLogout() {
      localStorage.removeItem(AUTH_SESSION_KEY);
      setAuthMode("login");
      applyAuthState();
    }

    function uid() {
      return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    function getBean(id) {
      return state.beans.find((bean) => bean.id === id);
    }

    function getRecipe(id) {
      return state.recipes.find((recipe) => recipe.id === id);
    }

    function getBeanLabel(id) {
      const bean = getBean(id);
      return bean ? `${bean.roastery} · ${bean.beanName}` : "연결 원두 없음";
    }

    function setActiveView(view) {
      activeView = view;
      document.querySelectorAll(".nav-button").forEach((button) => {
        button.classList.toggle("active", button.dataset.view === view);
      });
      document.querySelectorAll(".tab").forEach((button) => {
        button.classList.toggle("active", button.dataset.tab === view);
      });

      const formView = view === "all" ? "beans" : view;
      Object.entries(forms).forEach(([type, form]) => {
        form.classList.toggle("hidden", type !== formView || view === "all");
      });

      document.getElementById("formTitle").textContent = formText[view].title;
      document.getElementById("formHelp").textContent = formText[view].help;
      document.getElementById("newButton").classList.toggle("hidden", view === "all");
      editing = { type: null, id: null };
      resetForms();
      render();
    }

    function resetForms() {
      Object.values(forms).forEach((form) => form.reset());
      document.getElementById("scoreRange").value = 7;
      document.getElementById("scoreValue").textContent = "7";
      forms.tastings.elements.date.valueAsDate = new Date();
      setRecipeSteps([{ time: "0:00", water: "", note: "뜸" }]);
      setCupNotes([]);
      editing = { type: null, id: null };
      updateSelects();
      updateSubmitLabels();
    }

    function safeColor(color) {
      return /^#[0-9a-f]{6}$/i.test(color) ? color : CUP_NOTE_WHEEL[0].color;
    }

    function polar(radius, degree) {
      const angle = (degree - 90) * Math.PI / 180;
      return [+(radius * Math.cos(angle)).toFixed(2), +(radius * Math.sin(angle)).toFixed(2)];
    }

    function arcPath(inner, outer, start, end) {
      const large = end - start > 180 ? 1 : 0;
      const [x1, y1] = polar(outer, start);
      const [x2, y2] = polar(outer, end);
      const [x3, y3] = polar(inner, end);
      const [x4, y4] = polar(inner, start);
      return `M${x1} ${y1} A${outer} ${outer} 0 ${large} 1 ${x2} ${y2} L${x3} ${y3} A${inner} ${inner} 0 ${large} 0 ${x4} ${y4}Z`;
    }

    function textColorFor(hex) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      return (r * 299 + g * 587 + b * 114) / 1000 > 165 ? "#4a3326" : "#fffaf3";
    }

    function wheelLabel(text, radius, middle, size, fill, weight) {
      const [x, y] = polar(radius, middle);
      const rotate = middle < 180 ? middle - 90 : middle + 90;
      return `<text x="${x}" y="${y}" transform="rotate(${rotate.toFixed(2)} ${x} ${y})" font-size="${size}" font-weight="${weight}" fill="${fill}">${text}</text>`;
    }

    function renderCupNoteWheel() {
      const total = CUP_NOTE_WHEEL.reduce((sum, group) => sum + group.notes.length, 0);
      const step = 360 / total;
      let angle = 0;
      let segments = "";
      let labels = "";

      CUP_NOTE_WHEEL.forEach((group) => {
        const start = angle;
        const end = start + group.notes.length * step;
        segments += `<path class="wheel-seg" d="${arcPath(24, 58, start, end)}" fill="${group.color}" data-color="${group.color}" role="button" tabindex="0" aria-label="${group.name}"><title>${group.name}</title></path>`;
        labels += wheelLabel(group.name, 41, (start + end) / 2, 7, textColorFor(group.color), 800);

        group.notes.forEach(([note, color], index) => {
          const noteStart = start + index * step;
          segments += `<path class="wheel-seg" d="${arcPath(58, 106, noteStart, noteStart + step)}" fill="${color}" data-color="${color}" data-note="${note}" role="button" tabindex="0" aria-label="${note}"><title>${note}</title></path>`;
          labels += wheelLabel(note, 82, noteStart + step / 2, note.length > 4 ? 5.6 : 6.4, textColorFor(color), 700);
        });
        angle = end;
      });

      cupNoteWheel.innerHTML = `
        <g class="wheel-segs">${segments}</g>
        <g class="wheel-labels">${labels}</g>
        <circle class="wheel-center" r="22" id="wheelCenter"></circle>
      `;
      updateCupNoteColor();
    }

    function updateCupNoteColor() {
      document.getElementById("cupNoteCurrent").style.setProperty("--note-color", selectedCupNoteColor);
      document.getElementById("wheelCenter").style.fill = selectedCupNoteColor;
      cupNoteCustomColor.value = selectedCupNoteColor;
    }

    function selectWheelSegment(segment) {
      cupNoteWheel.querySelectorAll(".wheel-seg.selected").forEach((item) => item.classList.remove("selected"));
      segment.classList.add("selected");
      segment.parentNode.appendChild(segment);
      selectedCupNoteColor = segment.dataset.color;
      if (segment.dataset.note) cupNoteInput.value = segment.dataset.note;
      updateCupNoteColor();
      cupNoteInput.focus();
    }

    function cupNoteChip(note, removable = false, index = 0) {
      const remove = removable
        ? `<button type="button" class="cupnote-remove" data-index="${index}" aria-label="${escapeHtml(note.text)} 삭제">×</button>`
        : "";
      return `<span class="cupnote" style="--note-color: ${safeColor(note.color)}">${escapeHtml(note.text)}${remove}</span>`;
    }

    function renderCupNoteList() {
      cupNoteList.innerHTML = cupNotes.length
        ? cupNotes.map((note, index) => cupNoteChip(note, true, index)).join("")
        : `<span class="cupnote-empty">휠에서 색을 고르고 향미를 입력한 뒤 추가하세요.</span>`;
    }

    function setCupNotes(notes = []) {
      cupNotes = notes.map((note) => ({ color: safeColor(note.color), text: String(note.text || "") })).filter((note) => note.text);
      cupNoteInput.value = "";
      renderCupNoteList();
    }

    function addCupNotes() {
      const texts = cupNoteInput.value.split(/[,，]/).map((text) => text.trim()).filter(Boolean);
      texts.forEach((text) => {
        if (!cupNotes.some((note) => note.text === text)) {
          cupNotes.push({ color: selectedCupNoteColor, text });
        }
      });
      cupNoteInput.value = "";
      renderCupNoteList();
    }

    function createStepRow(step = {}) {
      const row = document.createElement("div");
      row.className = "step-row";
      const time = parseStepTime(step.time);
      row.innerHTML = `
        <div class="time-row" aria-label="단계 시간">
          <input type="number" min="0" step="1" data-step-minutes placeholder="분" value="${escapeHtml(time.minutes)}" aria-label="분" />
          <input type="number" min="0" max="59" step="5" data-step-seconds placeholder="초" value="${escapeHtml(time.seconds)}" aria-label="초" />
        </div>
        <input type="number" min="0" step="1" data-step-water placeholder="물양 g" value="${escapeHtml(step.water || "")}" aria-label="단계 물양" />
        <input type="text" data-step-note placeholder="메모 선택: 뜸, 1차 푸어" value="${escapeHtml(step.note || "")}" aria-label="단계 메모" />
        <button class="mini-button" type="button" data-action="remove-step" title="단계 삭제">삭제</button>
      `;
      recipeSteps.appendChild(row);
      updateStepsPreview();
    }

    function setRecipeSteps(steps = []) {
      recipeSteps.innerHTML = "";
      const normalized = steps.length ? steps : [{ time: "0:00", water: "", note: "뜸" }];
      normalized.forEach(createStepRow);
      updateStepsPreview();
    }

    function collectRecipeSteps() {
      return [...recipeSteps.querySelectorAll(".step-row")]
        .map((row) => ({
          time: formatStepTime(
            row.querySelector("[data-step-minutes]").value,
            row.querySelector("[data-step-seconds]").value
          ),
          water: row.querySelector("[data-step-water]").value.trim(),
          note: row.querySelector("[data-step-note]").value.trim()
        }))
        .filter((step) => step.time || step.water || step.note);
    }

    function parseStepTime(value = "") {
      const text = String(value).trim();
      if (!text) return { minutes: "", seconds: "" };
      if (text.includes(":")) {
        const [minutes, seconds] = text.split(":");
        return {
          minutes: String(Number(minutes) || 0),
          seconds: String(Number(seconds) || 0)
        };
      }
      return { minutes: String(Number(text) || 0), seconds: "0" };
    }

    function formatStepTime(minutes, seconds) {
      if (String(minutes).trim() === "" && String(seconds).trim() === "") return "";
      const min = Number(minutes);
      const sec = Number(seconds);
      if (!Number.isFinite(min) && !Number.isFinite(sec)) return "";
      const safeMin = Number.isFinite(min) && min > 0 ? Math.floor(min) : 0;
      const safeSec = Number.isFinite(sec) && sec > 0 ? Math.min(Math.floor(sec), 59) : 0;
      return `${safeMin}:${String(safeSec).padStart(2, "0")}`;
    }

    function stepToText(step, index) {
      const time = step.time || `단계 ${index + 1}`;
      const water = step.water ? `${step.water}g` : "물양 미입력";
      const note = step.note ? ` ${step.note}` : "";
      return `${time} ${water}${note}`;
    }

    function stepsToText(steps) {
      return steps.map(stepToText).join("\n");
    }

    function updateStepsPreview() {
      const steps = collectRecipeSteps();
      const text = stepsToText(steps);
      stepsText.value = text;
      stepsPreview.textContent = text || "시간과 물양을 입력하면 추출 단계가 자동으로 만들어집니다.";
    }

    function parseStepsText(text = "") {
      return text.split(/\n+/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const timeMatch = line.match(/^(\d{1,2}:\d{2}|\d{1,2})/);
          const waterMatch = line.match(/(\d+(?:\.\d+)?)\s*g/i);
          const time = timeMatch ? timeMatch[1] : "";
          const water = waterMatch ? waterMatch[1] : "";
          const note = line
            .replace(timeMatch?.[0] || "", "")
            .replace(waterMatch?.[0] || "", "")
            .trim();
          return { time, water, note };
        });
    }

    function updateSubmitLabels() {
      forms.beans.querySelector("[type='submit']").textContent = editing.type === "beans" ? "원두 수정" : "원두 저장";
      forms.recipes.querySelector("[type='submit']").textContent = editing.type === "recipes" ? "레시피 수정" : "레시피 저장";
      forms.tastings.querySelector("[type='submit']").textContent = editing.type === "tastings" ? "오늘의 커피 수정" : "오늘의 커피 저장";
    }

    function updateSelects() {
      const beanOptions = state.beans.map((bean) => `<option value="${bean.id}">${escapeHtml(bean.roastery)} · ${escapeHtml(bean.beanName)}</option>`).join("");
      const emptyBean = `<option value="">원두 선택</option>`;
      document.getElementById("recipeBeanSelect").innerHTML = emptyBean + beanOptions;
      document.getElementById("tastingBeanSelect").innerHTML = emptyBean + beanOptions;

      const recipeOptions = state.recipes.map((recipe) => {
        const bean = getBeanLabel(recipe.beanId);
        return `<option value="${recipe.id}">${escapeHtml(recipe.dripper)} · ${escapeHtml(bean)}</option>`;
      }).join("");
      document.getElementById("tastingRecipeSelect").innerHTML = `<option value="">레시피 선택</option>` + recipeOptions;
    }

    function formToObject(form) {
      const data = Object.fromEntries(new FormData(form).entries());
      Object.keys(data).forEach((key) => {
        if (typeof data[key] === "string") data[key] = data[key].trim();
      });
      return data;
    }

    function calculateRatio(coffeeDose, waterAmount) {
      const coffee = Number(coffeeDose);
      const water = Number(waterAmount);
      if (!coffee || !water || coffee <= 0 || water <= 0) return "";
      const ratio = water / coffee;
      return `1:${Number.isInteger(ratio) ? ratio : ratio.toFixed(1)}`;
    }

    function formatGrindSize(grindMin, grindMax) {
      if (grindMin && grindMax) return `${grindMin}~${grindMax} μm`;
      if (grindMin) return `${grindMin} μm+`;
      if (grindMax) return `up to ${grindMax} μm`;
      return "";
    }

    function parseGrindSize(grindSize = "") {
      const values = String(grindSize).match(/\d+/g) || [];
      return {
        grindMin: values[0] || "",
        grindMax: values[1] || values[0] || ""
      };
    }

    function updateRecipeDerivedFields() {
      const form = forms.recipes;
      form.elements.ratio.value = calculateRatio(form.elements.coffeeDose.value, form.elements.waterAmount.value);
    }

    function upsert(type, payload) {
      if (editing.type === type && editing.id) {
        state[type] = state[type].map((item) => item.id === editing.id ? { ...item, ...payload, updatedAt: new Date().toISOString() } : item);
      } else {
        state[type].unshift({ id: uid(), ...payload, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      }
      saveState();
      resetForms();
      render();
    }

    function handleBeanSubmit(event) {
      event.preventDefault();
      upsert("beans", formToObject(event.currentTarget));
    }

    function handleRecipeSubmit(event) {
      event.preventDefault();
      updateRecipeDerivedFields();
      updateStepsPreview();
      const recipeStepList = collectRecipeSteps();
      const hasUsableStep = recipeStepList.some((step) => step.time && step.water);
      if (!hasUsableStep) {
        alert("추출 단계에 시간과 물양을 최소 1개 이상 입력해주세요.");
        return;
      }
      const payload = formToObject(event.currentTarget);
      payload.recipeSteps = recipeStepList;
      payload.steps = stepsToText(recipeStepList);
      payload.ratio = calculateRatio(payload.coffeeDose, payload.waterAmount);
      payload.grindSize = formatGrindSize(payload.grindMin, payload.grindMax);
      payload.brewTime = "";
      upsert("recipes", payload);
    }

    function handleTastingSubmit(event) {
      event.preventDefault();
      addCupNotes();
      const payload = formToObject(event.currentTarget);
      payload.cupNotes = cupNotes.map((note) => ({ ...note }));
      upsert("tastings", payload);
    }

    function editItem(type, id) {
      const item = state[type].find((entry) => entry.id === id);
      if (!item) return;
      setActiveView(type);
      editing = { type, id };
      updateSubmitLabels();
      const form = forms[type];
      Object.entries(item).forEach(([key, value]) => {
        if (form.elements[key]) form.elements[key].value = value;
      });
      if (type === "recipes") {
        if ((!form.elements.grindMin.value && !form.elements.grindMax.value) && item.grindSize) {
          const parsedGrind = parseGrindSize(item.grindSize);
          form.elements.grindMin.value = parsedGrind.grindMin;
          form.elements.grindMax.value = parsedGrind.grindMax;
        }
        updateRecipeDerivedFields();
        setRecipeSteps(item.recipeSteps || parseStepsText(item.steps));
      }
      if (type === "tastings") {
        document.getElementById("scoreValue").textContent = form.elements.score.value;
        setCupNotes(item.cupNotes || []);
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function deleteItem(type, id) {
      const label = type === "beans" ? "원두" : type === "recipes" ? "레시피" : "오늘의 커피";
      if (!confirm(`${label} 기록을 삭제할까요?`)) return;
      state[type] = state[type].filter((item) => item.id !== id);
      if (type === "beans") {
        state.recipes = state.recipes.map((recipe) => recipe.beanId === id ? { ...recipe, beanId: "" } : recipe);
        state.tastings = state.tastings.map((tasting) => tasting.beanId === id ? { ...tasting, beanId: "" } : tasting);
      }
      if (type === "recipes") {
        state.tastings = state.tastings.map((tasting) => tasting.recipeId === id ? { ...tasting, recipeId: "" } : tasting);
      }
      saveState();
      resetForms();
      render();
    }

    function duplicateRecipe(id) {
      const recipe = getRecipe(id);
      if (!recipe) return;
      const copy = {
        ...recipe,
        id: uid(),
        dripper: `${recipe.dripper} 복사본`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state.recipes.unshift(copy);
      saveState();
      render();
    }

    function escapeHtml(value) {
      return String(value ?? "").replace(/[&<>"']/g, (char) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[char]);
    }

    function visibleItems() {
      const search = document.getElementById("searchInput").value.trim().toLowerCase();
      const sort = document.getElementById("sortSelect").value;
      const types = activeView === "all" ? ["beans", "recipes", "tastings"] : [activeView];
      let items = types.flatMap((type) => state[type].map((item) => ({ ...item, type })));

      if (search) {
        items = items.filter((item) => JSON.stringify(item).toLowerCase().includes(search) || getBeanLabel(item.beanId).toLowerCase().includes(search));
      }

      items.sort((a, b) => {
        if (sort === "oldest") return new Date(a.createdAt) - new Date(b.createdAt);
        if (sort === "name") return itemTitle(a).localeCompare(itemTitle(b), "ko");
        if (sort === "score") return Number(b.score || 0) - Number(a.score || 0);
        return new Date(b.createdAt) - new Date(a.createdAt);
      });

      return items;
    }

    function itemTitle(item) {
      if (item.type === "beans") return `${item.roastery} ${item.beanName}`;
      if (item.type === "recipes") return `${item.dripper} ${getBeanLabel(item.beanId)}`;
      return `${getBeanLabel(item.beanId)} ${item.date || ""}`;
    }

    function renderEntry(item) {
      if (item.type === "beans") {
        return `
          <article class="entry">
            <div class="entry-top">
              <div>
                <h3>${escapeHtml(item.beanName || "이름 없는 원두")}</h3>
                <p>${escapeHtml(item.roastery || "로스터리 미입력")} · ${escapeHtml(item.origin || "원산지 미입력")}</p>
              </div>
              <div class="entry-actions">
                <button class="mini-button" type="button" title="수정" data-action="edit" data-type="beans" data-id="${item.id}">수정</button>
                <button class="mini-button" type="button" title="삭제" data-action="delete" data-type="beans" data-id="${item.id}">삭제</button>
              </div>
            </div>
            <div class="tags">
              ${item.variety ? `<span class="tag">${escapeHtml(item.variety)}</span>` : ""}
              ${item.process ? `<span class="tag green">${escapeHtml(item.process)}</span>` : ""}
              ${item.roastPoint ? `<span class="tag amber">${escapeHtml(item.roastPoint)}</span>` : ""}
            </div>
            ${item.notes ? `<p>${escapeHtml(item.notes)}</p>` : ""}
          </article>
        `;
      }

      if (item.type === "recipes") {
        return `
          <article class="entry">
            <div class="entry-top">
              <div>
                <h3>${escapeHtml(item.dripper || "드리퍼 미입력")} · ${escapeHtml(item.ratio || "비율 미입력")}</h3>
                <p>${escapeHtml(getBeanLabel(item.beanId))}</p>
              </div>
              <div class="entry-actions">
                <button class="mini-button" type="button" title="복사" data-action="duplicate" data-type="recipes" data-id="${item.id}">복사</button>
                <button class="mini-button" type="button" title="수정" data-action="edit" data-type="recipes" data-id="${item.id}">수정</button>
                <button class="mini-button" type="button" title="삭제" data-action="delete" data-type="recipes" data-id="${item.id}">삭제</button>
              </div>
            </div>
            <div class="tags">
              ${item.filter ? `<span class="tag">${escapeHtml(item.filter)}</span>` : ""}
              ${item.coffeeDose ? `<span class="tag green">${escapeHtml(item.coffeeDose)}g 원두</span>` : ""}
              ${item.waterAmount ? `<span class="tag green">${escapeHtml(item.waterAmount)}g 물</span>` : ""}
              ${item.waterTemp ? `<span class="tag amber">${escapeHtml(item.waterTemp)}C</span>` : ""}
            </div>
            <p>${escapeHtml(item.grindSize || "분쇄도 미입력")}</p>
            <p class="steps-output">${escapeHtml(item.steps || "")}</p>
          </article>
        `;
      }

      const recipe = getRecipe(item.recipeId);
      return `
        <article class="entry">
          <div class="entry-top">
            <div>
              <h3>${escapeHtml(getBeanLabel(item.beanId))}</h3>
              <p>${escapeHtml(item.date || "날짜 미입력")} · ${recipe ? escapeHtml(recipe.dripper) : "연결 레시피 없음"}</p>
            </div>
            <div class="entry-actions">
              <button class="mini-button" type="button" title="수정" data-action="edit" data-type="tastings" data-id="${item.id}">수정</button>
              <button class="mini-button" type="button" title="삭제" data-action="delete" data-type="tastings" data-id="${item.id}">삭제</button>
            </div>
          </div>
          <div class="tags">
            <span class="tag rose">평점 ${escapeHtml(item.score || "-")}/10</span>
          </div>
          ${item.cupNotes?.length ? `<div class="cupnote-list">${item.cupNotes.map((note) => cupNoteChip(note)).join("")}</div>` : ""}
          <p>${escapeHtml(item.flavor || "")}</p>
          ${item.feedback ? `<p>${escapeHtml(item.feedback)}</p>` : ""}
        </article>
      `;
    }

    function renderList() {
      const list = document.getElementById("entryList");
      const items = visibleItems();
      if (!items.length) {
        list.innerHTML = `<div class="empty">아직 표시할 기록이 없습니다.<br />왼쪽 입력 영역에서 첫 기록을 저장해보세요.</div>`;
        return;
      }
      list.innerHTML = items.map(renderEntry).join("");
    }

    function render() {
      updateSelects();
      renderList();
    }

    function exportData() {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `bean-journal-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }

    function importData(event) {
      const file = event.target.files[0];
      event.target.value = "";
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        let data;
        try {
          data = JSON.parse(reader.result);
        } catch {
          alert("JSON 파일을 읽을 수 없습니다. 내보내기로 만든 파일인지 확인해 주세요.");
          return;
        }

        const types = ["beans", "recipes", "tastings"];
        if (!data || typeof data !== "object" || !types.some((type) => Array.isArray(data[type]))) {
          alert("원두, 레시피, 오늘의 커피 기록이 들어 있는 파일이 아닙니다.");
          return;
        }

        let added = 0;
        let updated = 0;
        types.forEach((type) => {
          const items = Array.isArray(data[type]) ? data[type] : [];
          items.forEach((raw) => {
            if (!raw || typeof raw !== "object" || Array.isArray(raw)) return;
            const now = new Date().toISOString();
            const item = { createdAt: now, updatedAt: now, ...raw, id: raw.id ? String(raw.id) : uid() };
            const index = state[type].findIndex((entry) => entry.id === item.id);
            if (index >= 0) {
              state[type][index] = item;
              updated += 1;
            } else {
              state[type].push(item);
              added += 1;
            }
          });
          state[type].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        });

        saveState();
        resetForms();
        render();
        alert(`가져오기 완료: 새 기록 ${added}개, 업데이트 ${updated}개`);
      };
      reader.onerror = () => alert("파일을 읽는 중 오류가 발생했습니다.");
      reader.readAsText(file);
    }

    function clearAll() {
      if (!confirm("저장된 모든 원두, 레시피, 오늘의 커피를 삭제할까요?")) return;
      state = structuredClone(initialData);
      saveState();
      resetForms();
      render();
    }

    function applyTheme(theme) {
      const isDark = theme === "dark";
      document.body.classList.toggle("dark", isDark);
      document.getElementById("darkModeToggle").checked = isDark;
    }

    function toggleDarkMode(event) {
      const theme = event.target.checked ? "dark" : "light";
      localStorage.setItem(THEME_KEY, theme);
      applyTheme(theme);
    }

    const settingsButton = document.getElementById("settingsButton");
    const settingsMenu = document.getElementById("settingsMenu");

    function setSettingsOpen(open) {
      settingsMenu.classList.toggle("hidden", !open);
      settingsButton.setAttribute("aria-expanded", String(open));
    }

    settingsButton.addEventListener("click", (event) => {
      event.stopPropagation();
      setSettingsOpen(settingsMenu.classList.contains("hidden"));
    });

    settingsMenu.addEventListener("click", (event) => {
      if (event.target.closest("button.settings-item")) setSettingsOpen(false);
    });

    document.addEventListener("click", (event) => {
      if (!event.target.closest(".settings")) setSettingsOpen(false);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setSettingsOpen(false);
    });

    document.getElementById("darkModeToggle").addEventListener("change", toggleDarkMode);

    document.querySelectorAll("[data-auth-tab]").forEach((button) => {
      button.addEventListener("click", () => setAuthMode(button.dataset.authTab));
    });

    document.getElementById("loginForm").addEventListener("submit", handleLogin);
    document.getElementById("signupForm").addEventListener("submit", handleSignup);
    document.getElementById("logoutButton").addEventListener("click", handleLogout);

    document.querySelectorAll(".nav-button").forEach((button) => {
      button.addEventListener("click", () => setActiveView(button.dataset.view));
    });

    document.querySelectorAll(".tab").forEach((button) => {
      button.addEventListener("click", () => setActiveView(button.dataset.tab));
    });

    forms.beans.addEventListener("submit", handleBeanSubmit);
    forms.recipes.addEventListener("submit", handleRecipeSubmit);
    forms.tastings.addEventListener("submit", handleTastingSubmit);

    forms.recipes.elements.coffeeDose.addEventListener("input", updateRecipeDerivedFields);
    forms.recipes.elements.waterAmount.addEventListener("input", updateRecipeDerivedFields);

    document.getElementById("scoreRange").addEventListener("input", (event) => {
      document.getElementById("scoreValue").textContent = event.target.value;
    });

    document.getElementById("addStepButton").addEventListener("click", () => {
      createStepRow();
    });

    cupNoteWheel.addEventListener("click", (event) => {
      const segment = event.target.closest(".wheel-seg");
      if (segment) selectWheelSegment(segment);
    });

    cupNoteWheel.addEventListener("keydown", (event) => {
      const segment = event.target.closest(".wheel-seg");
      if (!segment || (event.key !== "Enter" && event.key !== " ")) return;
      event.preventDefault();
      selectWheelSegment(segment);
    });

    cupNoteCustomColor.addEventListener("input", (event) => {
      cupNoteWheel.querySelectorAll(".wheel-seg.selected").forEach((item) => item.classList.remove("selected"));
      selectedCupNoteColor = event.target.value;
      updateCupNoteColor();
    });

    cupNoteInput.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" || event.isComposing) return;
      event.preventDefault();
      addCupNotes();
    });

    document.getElementById("addCupNoteButton").addEventListener("click", addCupNotes);

    cupNoteList.addEventListener("click", (event) => {
      const button = event.target.closest(".cupnote-remove");
      if (!button) return;
      cupNotes.splice(Number(button.dataset.index), 1);
      renderCupNoteList();
    });

    renderCupNoteWheel();

    recipeSteps.addEventListener("input", updateStepsPreview);

    recipeSteps.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='remove-step']");
      if (!button) return;
      button.closest(".step-row").remove();
      if (!recipeSteps.querySelector(".step-row")) createStepRow();
      updateStepsPreview();
    });

    document.getElementById("newButton").addEventListener("click", resetForms);
    document.getElementById("exportButton").addEventListener("click", exportData);
    document.getElementById("importButton").addEventListener("click", () => document.getElementById("importFile").click());
    document.getElementById("importFile").addEventListener("change", importData);
    document.getElementById("clearButton").addEventListener("click", clearAll);
    document.getElementById("searchInput").addEventListener("input", renderList);
    document.getElementById("sortSelect").addEventListener("change", renderList);

    document.getElementById("entryList").addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const { action, type, id } = button.dataset;
      if (action === "edit") editItem(type, id);
      if (action === "delete") deleteItem(type, id);
      if (action === "duplicate") duplicateRecipe(id);
    });

    applyTheme(localStorage.getItem(THEME_KEY));
    applyAuthState();
    resetForms();
    render();
