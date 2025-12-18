import { addIcon, MarkdownView, Notice, Plugin, TAbstractFile, TFile, WorkspaceLeaf, moment } from 'obsidian';
import * as feather from 'feather-icons';
import { DEFAULT_SETTINGS, PomoSettings, PomoSettingTab } from './settings';
import { getDailyNoteFile, Mode, Timer } from './timer';
import FlexiblePomoWorkbench from "./workbench";
import { DEFAULT_DATA, FilePath, WorkbenchItemsListViewType } from "./workbench_data";
import { ParseUtility } from "./parse_utility";
import { WorkItem } from "./workitem";
import { WorkbenchItemsListView } from "./workbench_view";
import { SavingSuggester } from "./flexipomosuggesters/SavingSuggester";
import { LoadingSuggester } from "./flexipomosuggesters/LoadingSuggester";
import { FileUtility } from "./file_utility";
import { askCustomTimeModal } from "./custom_time_modal";

export default class FlexiblePomoTimerPlugin extends Plugin {
	settings: PomoSettings;
	statusBar: HTMLElement;
	timer: Timer;
	pomoWorkBench: FlexiblePomoWorkbench;
	parseUtility: ParseUtility;
	saving_suggester: SavingSuggester;
	loading_suggester: LoadingSuggester;
	fileUtility: FileUtility;
	
	opened_file_path: string | null = null;
	lastOpenedFile: TFile | null = null; // new fallback for last active file

	async onload() {
		// detach old leaves during start
		this.app.workspace.detachLeavesOfType(WorkbenchItemsListViewType);

		await this.loadSettings();
		this.addSettingTab(new PomoSettingTab(this.app, this));

		this.statusBar = this.addStatusBarItem();
		this.statusBar.addClass("statusbar-pomo");

		if (this.settings.logging === true) this.openLogFileOnClick();

		this.timer = new Timer(this);

		if (this.settings.ribbonIcon) {
			this.addRibbonIcon('clock', 'Start Pomodoro', () => {
				const file = this.getCurrentFile();
				if ((this.settings.logActiveNote && file) || !this.settings.logActiveNote) {
					this.timer.onRibbonIconClick();
					this.pomoWorkBench.redraw();
					if (this.pomoWorkBench) this.savePomoWorkBench();
				} else {
					new Notice('Please open an active note first.');
				}
			});
		}

		this.pomoWorkBench = new FlexiblePomoWorkbench(this.app.workspace.activeLeaf, this, DEFAULT_DATA);
		this.fileUtility = new FileUtility(this);
		this.saving_suggester = new SavingSuggester(this);
		this.loading_suggester = new LoadingSuggester(this);

		this.registerView(
			WorkbenchItemsListViewType,
			leaf => (this.pomoWorkBench.view = new WorkbenchItemsListView(leaf, this, this.pomoWorkBench.data, this.pomoWorkBench))
		);

		(this.app.workspace as any).registerHoverLinkSource(WorkbenchItemsListViewType, {
			display: 'Pomo Workbench',
			defaultMod: true,
		});

		if (this.app.workspace.layoutReady) await this.pomoWorkBench.initView();
		else this.registerEvent(this.app.workspace.on('quit', this.pomoWorkBench.initView));

		this.registerInterval(window.setInterval(async () =>
			this.statusBar.setText(await this.timer.setStatusBarText()), 500
		));

		addIcon("feather-play", feather.icons.play.toString());
		addIcon("feather-pause", feather.icons.pause.toString());
		addIcon("feather-quit", feather.icons.x.toSvg({ viewBox: "0 0 24 24", width: "100", height: "100" }).toString());
		addIcon("feather-headphones", feather.icons.headphones.toString());

		this.parseUtility = new ParseUtility(this);

		// Capture last opened file for fallback
		this.app.workspace.on("file-open", (file: TFile) => {
			if (file) this.lastOpenedFile = file;
			this.pomoWorkBench.redraw();
		});

		this.registerEvent(this.app.vault.on('delete', this.handleDelete));
		this.registerEvent(this.app.vault.on('rename', this.handleRename));
	}

	// --- Utilities ---
	public getCurrentFile(): TFile | null {
		return this.app.workspace.getActiveFile() || this.lastOpenedFile;
	}

	private isActive() {
		return this.timer.mode === Mode.Pomo || this.timer.mode === Mode.Stopwatch || this.timer.mode === Mode.PomoCustom;
	}

	private isInactive() {
		return !this.isActive();
	}

	async savePomoWorkBench() {
		if (this.isInactive()) {
			this.pomoWorkBench.modified = false;
			this.pomoWorkBench.workItems = [];
			await this.extractWorkItems();
			const file = this.app.vault.getAbstractFileByPath(this.settings.active_workbench_path) as TFile;
			this.fileUtility.handleAppend(file);
		} else {
			const file = this.app.vault.getAbstractFileByPath(this.settings.active_workbench_path) as TFile;
			this.pomoWorkBench.modified = false;
			this.fileUtility.handleAppend(file);
		}
		this.pomoWorkBench.redraw();
	}

	private async extractWorkItems() {
		for (const workBenchFile of this.pomoWorkBench.data.workbenchFiles) {
			const tFile: TFile = this.app.vault.getAbstractFileByPath(workBenchFile.path) as TFile;
			const workItem = new WorkItem(tFile, true);
			await this.parseUtility.gatherLineItems(workItem, workItem.initialPomoTaskItems, true, workItem.activeNote);
		}
	}

	// --- File linking ---
	private unlinkFile(tFile: TFile) {
		if (this.isActive()) {
			const workItem = this.pomoWorkBench.workItems.find(w => w.activeNote.path === tFile.path);
			if (workItem) {
				this.pomoWorkBench.modified = true;
				this.pomoWorkBench.unlinkItem(workItem);
				new Notice('Unlinking Active Note From Workbench');
			}
		} else {
			const dataFile = this.pomoWorkBench.data.workbenchFiles.find(f => f.path === tFile.path);
			if (dataFile) {
				this.pomoWorkBench.modified = true;
				this.pomoWorkBench.data.workbenchFiles.remove(dataFile);
			}
			this.pomoWorkBench.redraw();
		}
	}

	private readonly handleDelete = async (file: TAbstractFile): Promise<void> => {
		const workbenchFile = this.pomoWorkBench.data.workbenchFiles.find(f => f.path === file.path);
		if (workbenchFile) this.unlinkFile(file as TFile);
	};

	private readonly handleRename = async (file: TAbstractFile, oldPath: string): Promise<void> => {
		const workbenchFile = this.pomoWorkBench.data.workbenchFiles.find(f => f.path === oldPath);
		if (workbenchFile) this.pomoWorkBench.data.workbenchFiles.remove(workbenchFile);

		if (this.isActive()) {
			const workItem = this.pomoWorkBench.workItems.find(w => w.activeNote.path === oldPath);
			if (workItem) this.pomoWorkBench.workItems.remove(workItem);
		}

		if (workbenchFile) {
			this.pomoWorkBench.modified = true;
			if ((this.getCurrentFile()?.path) === file.path) this.lastOpenedFile = file as TFile;
			this.pomoWorkBench.linkFile(file as TFile, null);
		}

		this.pomoWorkBench.redraw();
	};

	openLogFileOnClick() {
		this.statusBar.addClass("statusbar-pomo-logging");
		this.statusBar.onClickEvent(async () => {
			if (this.settings.logging) {
				try {
					const file = this.settings.logToDaily ? (await getDailyNoteFile()).path : this.settings.logFile;
					this.app.workspace.openLinkText(file, '', false);
				} catch {}
			}
		});
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}
