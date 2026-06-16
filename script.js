    const STORAGE_KEY = "bean-journal-v1";
    const AUTH_USERS_KEY = "bean-journal-users-v1";
    const AUTH_SESSION_KEY = "bean-journal-session-v1";

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
        title: "맛 기록 추가",
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
      editing = { type: null, id: null };
      updateSelects();
      updateSubmitLabels();
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
      forms.tastings.querySelector("[type='submit']").textContent = editing.type === "tastings" ? "맛 기록 수정" : "맛 기록 저장";
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
      upsert("tastings", formToObject(event.currentTarget));
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
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    function deleteItem(type, id) {
      const label = type === "beans" ? "원두" : type === "recipes" ? "레시피" : "맛 기록";
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

    function renderStats() {
      document.getElementById("beanCount").textContent = state.beans.length;
      document.getElementById("recipeCount").textContent = state.recipes.length;
      document.getElementById("tastingCount").textContent = state.tastings.length;

      const latestBean = state.beans[0];
      document.getElementById("latestBean").textContent = latestBean ? `${latestBean.roastery} · ${latestBean.beanName}` : "아직 원두가 없습니다";

      const latestRecipe = state.recipes[0];
      document.getElementById("favoriteRatio").textContent = latestRecipe ? `${latestRecipe.ratio || "비율 미입력"} · ${latestRecipe.dripper}` : "비율 기록 대기";

      const scores = state.tastings.map((item) => Number(item.score)).filter(Number.isFinite);
      const average = scores.length ? (scores.reduce((sum, score) => sum + score, 0) / scores.length).toFixed(1) : null;
      document.getElementById("avgScore").textContent = average ? `평균 ${average}/10` : "평점 대기";

      const latestTasting = state.tastings[0];
      document.getElementById("latestScore").textContent = latestTasting ? `${latestTasting.score}/10` : "-";
      document.getElementById("latestFeedback").textContent = latestTasting?.feedback || "새 컵을 기록해보세요";
    }

    function render() {
      updateSelects();
      renderStats();
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

    function clearAll() {
      if (!confirm("저장된 모든 원두, 레시피, 맛 기록을 삭제할까요?")) return;
      state = structuredClone(initialData);
      saveState();
      resetForms();
      render();
    }

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

    applyAuthState();
    resetForms();
    render();
