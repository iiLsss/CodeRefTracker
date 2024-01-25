import * as vscode from 'vscode';

/**
 * 管理和处理VSCode插件中的资源清理，Disposable类用于统一管理和释放一组vscode.Disposable对象，toDisposable函数则是创建一个vscode.Disposable对象的简便方式。
 */
export class Disposable implements vscode.Disposable {
	private disposables: vscode.Disposable[] = [];
	private disposed: boolean = false;

	/**
	 * 清理子类使用的资源。
	 */
	public dispose() {
		this.disposed = true;
		this.disposables.forEach((disposable) => {
			try {
				disposable.dispose();
			} catch (_) { }
		});
		this.disposables = [];
	}

	/**
	 * 注册一个单独的可清理项。
	 */
	protected registerDisposable(disposable: vscode.Disposable) {
		this.disposables.push(disposable);
	}

	/**
	 * 注册多个可清理项。
	 */
	protected registerDisposables(...disposables: vscode.Disposable[]) {
		this.disposables.push(...disposables);
	}

	/**
	 * 判断Disposable是否已被清理。
	 * @returns `TRUE` => Disposable已被清理, `FALSE` => Disposable尚未被清理。
	 */
	protected isDisposed() {
		return this.disposed;
	}
}

export function toDisposable(fn: () => void): vscode.Disposable {
	return {
		dispose: fn
	};
}