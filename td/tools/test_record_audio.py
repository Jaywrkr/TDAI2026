#!/usr/bin/env python3
"""Comprueba que el boton de grabar no inicie una toma sin Audio CHOP."""

from pathlib import Path
from tempfile import TemporaryDirectory


class Param:
    def __init__(self, value):
        self.val = value

    def eval(self):
        return self.val


class Params:
    def __init__(self, **values):
        for name, value in values.items():
            setattr(self, name, Param(value))

    def __setattr__(self, name, value):
        current = self.__dict__.get(name)
        if isinstance(current, Param) and not isinstance(value, Param):
            current.val = value
        else:
            object.__setattr__(self, name, value)


class Operator:
    def __init__(self, **params):
        self.par = Params(**params)


def main():
    source = Path(__file__).resolve().parents[1] / 'vjcore' / 'dats' / 'control_script.py'
    namespace = {'__name__': 'control_script_record_test'}
    exec(compile(source.read_text(encoding='utf-8'), str(source), 'exec'),
         namespace)
    with TemporaryDirectory() as folder:
        project = Operator(Record=False, Recordfolder=folder)
        recorder = Operator(audiochop='', file='')
        audio = Operator()
        operators = {'/project1': project, '/project1/recorder': recorder,
                     '/project1/audio1': audio}
        namespace['op'] = operators.get
        toggle = namespace['toggleRecord']

        toggle()
        assert project.par.Record.eval() is False
        assert recorder.par.file.eval() == ''

        recorder.par.audiochop = '/project1/audio1'
        toggle()
        assert project.par.Record.eval() is True
        assert Path(recorder.par.file.eval()).parent == Path(folder)
        assert Path(recorder.par.file.eval()).suffix == '.mov'

        toggle()
        assert project.par.Record.eval() is False
    print('TODO OK: sin audio no inicia; con audio graba y se detiene')


if __name__ == '__main__':
    main()
