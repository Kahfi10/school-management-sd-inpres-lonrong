// Apple HIG Skeleton Loader Generator for Silky-Smooth Page Transitions
export function renderPageSkeleton(container: HTMLElement, navKey: string) {
  const isTableView = navKey === 'siswa' || navKey === 'sarpras';
  const isCardView = navKey === 'kepegawaian' || navKey === 'jurnal' || navKey === 'efiling';
  const isDashboard = navKey === 'dashboard';

  let specificSkeletonHtml = '';

  if (isDashboard) {
    specificSkeletonHtml = `
      <!-- Top Bento Metric Cards (4 Columns) -->
      <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 1.25rem; margin-bottom: 1.5rem;">
        ${[1, 2, 3, 4].map(() => `
          <div class="bento-card skeleton-card" style="grid-column: span 3; padding: 1.25rem 1.4rem; display: flex; flex-direction: column; gap: 0.75rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div class="apple-skeleton" style="width: 38px; height: 38px; border-radius: 10px;"></div>
              <div class="apple-skeleton" style="width: 50px; height: 18px; border-radius: 9999px;"></div>
            </div>
            <div class="apple-skeleton" style="width: 60%; height: 26px; border-radius: 6px;"></div>
            <div class="apple-skeleton" style="width: 80%; height: 14px; border-radius: 4px;"></div>
          </div>
        `).join('')}
      </div>

      <!-- Main Chart Grids -->
      <div style="display: grid; grid-template-columns: repeat(12, 1fr); gap: 1.25rem;">
        <div class="bento-card skeleton-card" style="grid-column: span 7; min-height: 280px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
          <div style="display: flex; justify-content: space-between;">
            <div class="apple-skeleton" style="width: 40%; height: 20px; border-radius: 6px;"></div>
            <div class="apple-skeleton" style="width: 25%; height: 16px; border-radius: 4px;"></div>
          </div>
          <div class="apple-skeleton" style="width: 100%; flex: 1; border-radius: 10px; min-height: 200px;"></div>
        </div>
        <div class="bento-card skeleton-card" style="grid-column: span 5; min-height: 280px; padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
          <div class="apple-skeleton" style="width: 50%; height: 20px; border-radius: 6px;"></div>
          <div class="apple-skeleton" style="width: 100%; flex: 1; border-radius: 10px; min-height: 200px;"></div>
        </div>
      </div>
    `;
  } else if (isTableView) {
    specificSkeletonHtml = `
      <!-- Table Filter Bar Skeleton -->
      <div class="bento-card skeleton-card" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center; gap: 1rem;">
        <div class="apple-skeleton" style="width: 280px; height: 36px; border-radius: 8px;"></div>
        <div style="display: flex; gap: 0.6rem;">
          <div class="apple-skeleton" style="width: 100px; height: 36px; border-radius: 8px;"></div>
          <div class="apple-skeleton" style="width: 110px; height: 36px; border-radius: 8px;"></div>
        </div>
      </div>

      <!-- Table Rows Skeleton -->
      <div class="bento-card skeleton-card" style="padding: 1.25rem; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; padding-bottom: 0.85rem; border-bottom: 1px solid var(--apple-border-subtle); margin-bottom: 0.85rem;">
          <div class="apple-skeleton" style="width: 15%; height: 16px; border-radius: 4px;"></div>
          <div class="apple-skeleton" style="width: 25%; height: 16px; border-radius: 4px;"></div>
          <div class="apple-skeleton" style="width: 20%; height: 16px; border-radius: 4px;"></div>
          <div class="apple-skeleton" style="width: 15%; height: 16px; border-radius: 4px;"></div>
          <div class="apple-skeleton" style="width: 12%; height: 16px; border-radius: 4px;"></div>
        </div>
        ${[1, 2, 3, 4, 5, 6].map(() => `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.85rem 0; border-bottom: 1px solid var(--apple-border-subtle);">
            <div style="display: flex; align-items: center; gap: 0.75rem; width: 40%;">
              <div class="apple-skeleton" style="width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0;"></div>
              <div style="display: flex; flex-direction: column; gap: 0.35rem; width: 80%;">
                <div class="apple-skeleton" style="width: 85%; height: 15px; border-radius: 4px;"></div>
                <div class="apple-skeleton" style="width: 50%; height: 11px; border-radius: 4px;"></div>
              </div>
            </div>
            <div class="apple-skeleton" style="width: 15%; height: 16px; border-radius: 4px;"></div>
            <div class="apple-skeleton" style="width: 18%; height: 16px; border-radius: 4px;"></div>
            <div class="apple-skeleton" style="width: 12%; height: 24px; border-radius: 9999px;"></div>
          </div>
        `).join('')}
      </div>
    `;
  } else {
    // Card Views (Kepegawaian, E-Filing, Jurnal, Buku Tamu)
    specificSkeletonHtml = `
      <!-- Grid Cards Skeleton -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 1.25rem;">
        ${[1, 2, 3, 4, 5, 6].map(() => `
          <div class="bento-card skeleton-card" style="padding: 1.35rem 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
              <div style="display: flex; gap: 0.75rem; align-items: center;">
                <div class="apple-skeleton" style="width: 42px; height: 42px; border-radius: 10px; flex-shrink: 0;"></div>
                <div style="display: flex; flex-direction: column; gap: 0.4rem;">
                  <div class="apple-skeleton" style="width: 140px; height: 16px; border-radius: 4px;"></div>
                  <div class="apple-skeleton" style="width: 90px; height: 12px; border-radius: 4px;"></div>
                </div>
              </div>
              <div class="apple-skeleton" style="width: 55px; height: 22px; border-radius: 9999px;"></div>
            </div>
            <div class="apple-skeleton" style="width: 100%; height: 50px; border-radius: 8px;"></div>
            <div class="apple-skeleton" style="width: 100%; height: 35px; border-radius: 8px;"></div>
            <div style="display: flex; justify-content: space-between; padding-top: 0.5rem; border-top: 1px solid var(--apple-border-subtle);">
              <div class="apple-skeleton" style="width: 110px; height: 14px; border-radius: 4px;"></div>
              <div class="apple-skeleton" style="width: 50px; height: 14px; border-radius: 4px;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  container.innerHTML = `
    <div class="view-skeleton-wrapper" style="opacity: 0.95; animation: appleSkeletonEnter 0.15s ease-out;">
      <!-- Page Header Skeleton -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.35rem;">
        <div style="display: flex; flex-direction: column; gap: 0.45rem;">
          <div class="apple-skeleton" style="width: 230px; height: 28px; border-radius: 6px;"></div>
          <div class="apple-skeleton" style="width: 320px; height: 15px; border-radius: 4px;"></div>
        </div>
        <div style="display: flex; gap: 0.65rem;">
          <div class="apple-skeleton" style="width: 120px; height: 36px; border-radius: 8px;"></div>
        </div>
      </div>

      <!-- Stat Counters Skeleton (4 Grid) -->
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
        ${[1, 2, 3, 4].map(() => `
          <div class="bento-card skeleton-card" style="padding: 1rem 1.15rem; display: flex; flex-direction: column; gap: 0.5rem;">
            <div class="apple-skeleton" style="width: 55%; height: 12px; border-radius: 4px;"></div>
            <div class="apple-skeleton" style="width: 40%; height: 24px; border-radius: 6px;"></div>
            <div class="apple-skeleton" style="width: 75%; height: 11px; border-radius: 4px;"></div>
          </div>
        `).join('')}
      </div>

      <!-- View Specific Skeleton Content -->
      ${specificSkeletonHtml}
    </div>
  `;
}
