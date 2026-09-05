const fs = require('fs');
let app = fs.readFileSync('src/App.tsx', 'utf8');

const targetInfo = `                    <span className="text-[10px] text-zinc-500">by GreenBox © 2026</span>
                  </div>
                </div>
              </div>
            </div>`;

const replaceInfo = `                    <span className="text-[10px] text-zinc-500">by GreenBox © 2026</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 pt-6 border-t border-white/5">
                <AppInstallUninstall />
              </div>
            </div>`;

if (app.includes(targetInfo)) {
  app = app.replace(targetInfo, replaceInfo);
  fs.writeFileSync('src/App.tsx', app, 'utf8');
  console.log('Patched More Tab');
} else {
  console.log('Target not found in More Tab');
}
